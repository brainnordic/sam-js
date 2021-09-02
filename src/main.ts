import Cookies from "js-cookie";
import { v4 as uuid } from 'uuid';
import qs from 'qs';
import {DataLayerHelper} from "./datalayer";

/**
 * BrainSam is tracking script used with https://strategicaudiencemap.com service
 *
 * ```typescript
 * const data:any[] = []
 * const brain_sam = new BrainSam(data) // initializes data container & triggers pageview event
 * data.push({user: {zipcode: '12345'}}) // stores data for future events
 * data.push({event: 'custom_event'}) //triggers custom event
 * ```
 */
export class BrainSam {

  static pixel_url = "https://mkt.dep-x.com/d3p_e.gif"
  data_layer: any;
  config: any;
  last_observable_value: string | undefined = undefined;
  interval: any;
  dom_content_loaded_listener: (() => void) | undefined = undefined;

  /**
   * Initializes BrainSam & processes commands in data layer (if any)
   * @param data commands input (array) - all commands present in array during initialization will processed immediately, push method will be proxied to BrainSam command processor
   * 
   * Available commands:
   * - `{config: {autoview: true}}` - triggers pageview after dom is loaded (default: true)
   * - `{config: {sam_id: 'abcde'}}` - sets master SAM id for events
   * - `{config: {observable: 'location'}}` - triggers pageview event of every location change (e.g with history.push)
   * - `{config: {observable: function() { return window.article_id }}}` - triggers pageview event of every value change
   * - `{event: 'custom_event', custom_data: 'aaaa'}` - triggers custom event
   * - `{user: {zipcode: '32423'}, page: {title: 'sfasfs'}}` - stores data id data layer for future events 
   *
   * Example:
   * ```typescript
   * const data:any[] = [{config: {autoview: false}}]
   * const brain_sam = new BrainSam(data) // initializes data container & triggers pageview event
   * data.push({user: {zipcode: '12345'}}) // stores data for future events
   * data.push({event: 'custom_event'}) //triggers custom event
   * ```
   */
  constructor(data: any) {
    let that = this;
    if(!data.installed) {
      data.installed = true
      this.data_layer = new DataLayerHelper(data, {
        commandProcessors: {
          'event': [function(event_name, data) { that.event(event_name, data) }],
          'plugin': [function(plugin_function) { plugin_function(that.data_layer) }]
        },
        processNow: false
      })

      this.data_layer.process()

      if(typeof this.getConfig().autoview === 'undefined' || this.getConfig().autoview) {
        this.last_observable_value = this.getObservableValue()
        if (document.readyState === 'loading') {
          this.dom_content_loaded_listener = function() { that.pageView() }
          document.addEventListener('DOMContentLoaded', this.dom_content_loaded_listener);
        } else {
          this.pageView()
        }
      }

      this.watchObservable()
    }
  }

  cleanup() {
    if(this.dom_content_loaded_listener) {
      document.removeEventListener('DOMContentLoaded', this.dom_content_loaded_listener)
     }
  }

  /**
   * Executes page view event, resets current observable value (if set in config)
   */
  pageView(){
    this.last_observable_value = this.getObservableValue()
    this.event('pageview')
  }

  /**
   * Return observable value, `location` => window.location.href, `function` => return value
   */
  getObservableValue(){
    if(this.getConfig().observable == 'location'){
      return window.location.href
    } else if (typeof this.getConfig().observable === 'function') {
      return this.getConfig().observable()
    } else {
      return undefined
    }
  }

  /**
   * Run 100ms inveral detecting observable changes
   */
  watchObservable(){
    let that = this;

    if(this.getConfig().observable) {
      this.interval = setInterval(function(){ 
        let new_value = that.getObservableValue();
        if(that.last_observable_value != undefined && new_value != undefined && that.last_observable_value != new_value) {
          that.pageView()
        }
        that.last_observable_value = new_value
       }, 100);
    }
  }

  /**
   * Extract & map pixel data from data layer (user -> u_, domain -> d_, session -> s_, event -> e_, page -> p_)
   */
  getPixelData(){
    let data = {}

    const mapped_items:any = {
      user: 'u_', u: 'u_',
      domain: 'd_', device: 'd_', d: 'd_',
      session: 's_', s: 's_',
      event: 'e_', e: 'e_',
      page: 'p_', p: 'p_'
    }

    for(const item in mapped_items){
      for (let [k, v] of Object.entries((this.data_layer.get(item) || {}))) {
        data[mapped_items[item]+k] = v;
      }
    }

    return data
  }

  /**
   * Get configuration object from data layer
   */
  getConfig(){
    return this.data_layer.get('config') || {}
  }

  /**
   * Sets 1st party `dep` cookie, Extracts current page info & data layer custom params & Executes event
   * @param event_name event name
   * @param obj optional extra data to be included in pixel call
   * @param callback optional callback function called after pixel sucessfully loaded
   */
  event(event_name: string, obj?: any, callback?: () => void) {
    this.setupDepCookie();
    let data = Object.assign({}, obj || {}, this.getPixelData());
    if(this.getConfig().sam_id) {
      data.n = this.getConfig().sam_id;
      data.e = event_name;
    } else {
      data.n = event_name;
    }
    data.l_u = this.setupDepCookie();
    data.p_d = window.location.host;
    data.p_l = window.location.href;
    data.p_r = document.referrer;
    data.dp_r = window.devicePixelRatio;
    data.p_h = Math.min(window.screen.height, 30000)
    data.p_w = Math.min(window.screen.width, 30000)
    this.pixel(data, callback)
  }

  /**
   * Execute pixel call
   * @param data data to be included in pixel call
   * @param callback optional callback function called after pixel sucessfully loaded
   */
  pixel(data: any, callback?: () => void) {
    let pixel = new Image();
    if(callback) {  
      pixel.onload = callback;
    }
    pixel.src = BrainSam.pixel_url + "?" + qs.stringify(data);
  }


  /**
   * Return or Sets 1st party `dep` cookie
   */
  setupDepCookie() {
    let cookie_id: string | undefined = Cookies.get("dep");
    if(!cookie_id) {
      cookie_id = uuid()
      Cookies.set("dep", cookie_id, { expires: 365 });
    }

    return cookie_id
  }
}
