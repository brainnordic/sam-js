import Cookies from "js-cookie";
import { v4 as uuid } from 'uuid';
import qs from 'qs';
import {DataLayerHelper} from "./datalayer";

export class BrainSam {
  static pixel_url = "https://mkt.dep-x.com/d3p_e.gif"
  data_layer: any;

  constructor(data: any) {
    this.data_layer = new DataLayerHelper(data)
    let that = this;
    this.data_layer.registerProcessor('event', function(event_name, data) { that.event(event_name, data) });
    this.data_layer.registerProcessor('plugin', function(plugin_function) { 
      plugin_function(that.data_layer);
    });
  }

  event(event_name: string, obj?: any, callback?: () => void) {
    this.setupDepCookie();
    let data = Object.assign({}, obj || {}, this.data_layer.get('user') || {});
    data.n = event_name;
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
