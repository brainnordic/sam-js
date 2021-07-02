import Cookies from "js-cookie";
import { v4 as uuid } from 'uuid';
import qs from 'qs';

export const delayMillis = (delayMs: number): Promise<void> => new Promise(resolve => setTimeout(resolve, delayMs));

export const greet = (name: string): string => `Hello ${name}`

export const foo = async (): Promise<boolean> => {
  console.log(greet('World'))
  await delayMillis(1000)
  console.log('done')
  return true
}

export class BrainSam {
  static pixel_url = "https://mkt.dep-x.com/d3p_e.gif"
  #greeting: string;

  constructor(message: string) {
    this.#greeting = message;
  }

  event(event_name: string, obj?: any, callback?: () => void) {
    this.setupDepCookie();
    obj = obj || {};
    obj.n = event_name;
    obj.l_u = this.setupDepCookie();
    obj.p_d = window.location.host;
    obj.p_l = window.location.href;
    obj.p_r = document.referrer;
    obj.dp_r = window.devicePixelRatio;
    obj.p_h = Math.min(window.screen.height, 30000)
    obj.p_w = Math.min(window.screen.width, 30000)
    this.pixel(obj, callback)
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

  greet() {
    let queryString = qs.stringify({page: "1", pagesize: "100"});

     console.log("Hello, " + this.#greeting);
     console.log(Cookies.get("dep"));
     console.log(queryString)
  }
}
