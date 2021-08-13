/**
 * @jest-environment jsdom
 */

import { BrainSam } from './main'

let pixels:string[] = []
const NativeImage = (global as any).Image;
let ready_state:string = 'completed'
let location:any = {}
let referrer:string = 'https://demo.com/banner1'
let screen:any = {}
let pixel_ratio:number =  2

jest.useFakeTimers('legacy');

beforeAll(() => {
  Object.defineProperty(document, "readyState", {
      get() { return ready_state; },
  });

  Object.defineProperty(window, "location", {
     get() { return location; },
  });

  Object.defineProperty(window, "screen", {
     get() { return screen; },
  });

  Object.defineProperty(window, "devicePixelRatio", {
      get() { return pixel_ratio; },
  });

  Object.defineProperty(document, "referrer", {
     get() { return referrer; },
  });

  class FakeImage {
    constructor(w, h) {
      const nativeImage = new NativeImage(w, h);
      const handler = {
        set: function(_, prop, value) {
          if (prop === 'src') {
            pixels.push(value)
          }
          return nativeImage[prop] = value;
        },
        get: function(target, prop) {
          return target[prop];
        }
      };
      return new Proxy(nativeImage, handler);
    }  
  }
  
  (global as any).Image = FakeImage;
})

beforeEach(() => {
  location = {href: 'https://example.com/home_page', host: 'example.com'}
  screen = {width: 1024, height: 784}

  ready_state = 'completed'
  referrer = 'https://demo.com/banner1'
  pixels = []
  pixel_ratio = 2
});

describe('when auto pageviews are enabled', () => {
  test('BrainSam executes pageview pixel after load', () => {
    let sam_data:any = []
    new BrainSam(sam_data);
    expect(pixels.length).toBe(1)
    expect(pixels[0]).toContain('n=pageview')
    sam_data.push({event: 'custom_event'})
    expect(pixels.length).toBe(2)
    expect(pixels[1]).toContain('n=custom_event')
  });

  test('pageview event is first event executed on loaded dom', () => {
    let sam_data:any = []
    new BrainSam(sam_data);
    expect(pixels.length).toBe(1)
    expect(pixels[0]).toContain('n=pageview')
    sam_data.push({event: 'custom_event'})
    expect(pixels.length).toBe(2)
    expect(pixels[1]).toContain('n=custom_event')
  });


  test("BrainSam doesn't execute pageview pixel if dom is still loading ", () => {
    let sam_data:any = []
    ready_state = 'loading'
    new BrainSam(sam_data);
    expect(pixels.length).toBe(0)
    sam_data.push({event: 'custom_event'})
    expect(pixels.length).toBe(1)
    expect(pixels[0]).toContain('n=custom_event')
  });
});

describe('when custom event is pushed to data layer', () => {
   test("BrainSam executes pixel with custom events", () => {
    let sam_data:any = []
    new BrainSam(sam_data);
    sam_data.push({event: 'custom_event', user_zipcode: '123213', conversion_value: 12.22})
    expect(pixels.length).toBe(2)
    expect(pixels[1]).toContain('n=custom_event')
  });

  test("BrainSam adds custom attributes to request", () => {
    let sam_data:any = []
    new BrainSam(sam_data);
    sam_data.push({event: 'custom_event', user_zipcode: '123213', conversion_value: 12.22})
    expect(pixels.length).toBe(2)
    expect(pixels[1]).toContain('user_zipcode=123213')
    expect(pixels[1]).toContain('conversion_value=12.22')
  });
});

test("BrainSam executes only once per data layer", () => {
    let sam_data:any = []
    new BrainSam(sam_data);
    sam_data.push({event: 'custom_event'})
    expect(pixels.length).toBe(2)

    new BrainSam(sam_data);
    expect(pixels.length).toBe(2)
    sam_data.push({event: 'custom_event2'})
     expect(pixels.length).toBe(3)
  });

describe('BrainSam includes basic location/window data to pageview event', () => {
  beforeEach(() => {
    let sam_data:any = []
    new BrainSam(sam_data);
  })

  test("page domain", () => {
    expect(pixels[0]).toContain('p_d=example.com')
  });

  test("page location", () => {
    expect(pixels[0]).toContain('p_l=https%3A%2F%2Fexample.com%2Fhome_page')
  });

  test("page referrer", () => {
    expect(pixels[0]).toContain('p_r=https%3A%2F%2Fdemo.com%2Fbanner1')
  });

  test("screen width", () => {
    expect(pixels[0]).toContain('p_w=1024')
  });

  test("screen height", () => {
    expect(pixels[0]).toContain('p_h=784')
  });

  test("device pixel ration", () => {
    expect(pixels[0]).toContain('p_r=2')
  });
});

describe('when observable value is defined to "location"', () => {
  beforeEach(() => {
    (setInterval as jest.Mock).mockReset()
  })

  test("it checks observable value every 100ms", () => {
    let sam_data:any = [{config: {observable: 'location'}}]
    new BrainSam(sam_data);
    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 100);
  })

  test("it triggers page view on every page view location change", () => {
    let sam_data:any = [{config: {observable: 'location'}}]
    let brain_sam = new BrainSam(sam_data);
    expect(pixels.length).toBe(1)
    expect(pixels[0]).toContain('p_l=https%3A%2F%2Fexample.com%2Fhome_page')

    location.href = "https://example.com/section_sport"

    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 100);
    jest.advanceTimersByTime(200000);

    console.log(brain_sam.getConfig())

    expect(pixels.length).toBe(2)
    expect(pixels[1]).toContain('p_l=https%3A%2F%2Fexample.com%2Fsection_sport')
  })
});

