import Cookies from "js-cookie";
import { v4 as uuid } from 'uuid';
import qs from 'qs';
import {DataLayerHelper} from "./datalayer";

export class BrainSam {
  static pixel_url = "https://mkt.dep-x.com/d3p_e.gif"
  data_layer: any;
  config: any;
  last_observable_value: string | undefined = undefined;
  interval: any;

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
        console.log('last_observable_value', that.getConfig().observable, Date.now(), that.last_observable_value, 'new value', new_value)
        if(that.last_observable_value != undefined && new_value != undefined && that.last_observable_value != new_value) {
          that.pageView()
        }
        that.last_observable_value = that.getObservableValue()
       }, 100);
    }
  }

  getConfig(){
    return this.data_layer.get('config') || {}
  }

  event(event_name: string, obj?: any, callback?: () => void) {
    this.setupDepCookie();
    let data = Object.assign({}, obj || {}, this.data_layer.get('user') || {});
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
