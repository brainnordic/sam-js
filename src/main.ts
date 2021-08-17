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

  /**
   * Initializes BrainSam & processes commands in data layer (if any)
   * @param data commands input (array) - all commands present in array during initialization will processed immediately, push method will be proxied to BrainSam command processor
   * 
   *
   * Example:
   * ```typescript
   * const data:any[] = [{config: {autoview: false}}]
   * const brain_sam = new BrainSam(data) // initializes data container
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
          document.addEventListener('DOMContentLoaded', this.pageView);
        } else {
          this.pageView()
        }
      }

      this.watchObservable()
    }
  }

  pageView(){
    this.last_observable_value = this.getObservableValue()
    this.event('pageview')
  }

  getObservableValue(){
    if(this.getConfig().observable == 'location'){
      return window.location.href
    } else if (typeof this.getConfig().observable === 'function') {
      return this.getConfig().observable()
    } else {
      return undefined
    }
  }

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

  getConfig(){
    return this.data_layer.get('config') || {}
  }

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

  pixel(data: any, callback?: () => void) {
    let pixel = new Image();
    if(callback) {  
      pixel.onload = callback;
    }
    pixel.src = BrainSam.pixel_url + "?" + qs.stringify(data);
  }

  setupDepCookie() {
    let cookie_id: string | undefined = Cookies.get("dep");
    if(!cookie_id) {
      cookie_id = uuid()
      Cookies.set("dep", cookie_id, { expires: 365 });
    }

    return cookie_id
  }
}
