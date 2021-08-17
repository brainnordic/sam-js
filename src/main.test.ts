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

afterEach(() => {
  jest.useRealTimers()
})

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
    jest.useFakeTimers()
  })

  test("it checks observable value every 100ms", () => {
    let sam_data:any = [{config: {autoview: false, observable: 'location'}}]
    let brain_sam = new BrainSam(sam_data);

    const callback = jest.fn();
    brain_sam.getObservableValue = callback
    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(2);
  })

  test("it triggers page view on every page view location change", () => {
    let sam_data:any = [{config: {observable: 'location'}}]
    new BrainSam(sam_data);
    expect(pixels.length).toBe(1)
    expect(pixels[0]).toContain('p_l=https%3A%2F%2Fexample.com%2Fhome_page')

    location.href = "https://example.com/section_sport"

    jest.advanceTimersByTime(100);

    expect(pixels.length).toBe(2)
    expect(pixels[1]).toContain('p_l=https%3A%2F%2Fexample.com%2Fsection_sport')
  })
});

describe('when observable value is defined to "custom function"', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

 
  test("it checks observable value every 100ms", () => {
    const callback = jest.fn();
    let sam_data:any = [{config: {autoview: false, observable: callback}}]
    new BrainSam(sam_data);
    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(2);
  })

  test("it triggers page view on every observable value change", () => {
    let observable_value = 'initial_value'
    let sam_data:any = [{config: {observable: function() { return observable_value }}}]
    new BrainSam(sam_data);

    sam_data.push({user: {test_data: 'example'}})

    expect(pixels.length).toBe(1)
    expect(pixels[0]).toContain('p_l=https%3A%2F%2Fexample.com%2Fhome_page')

    observable_value = 'new_value'

    jest.advanceTimersByTime(100);

    expect(pixels.length).toBe(2)
    expect(pixels[1]).toContain('u_test_data=example')
  })
});

describe('data layer', () => {
  test("it appends any data with user prefix to u_* data points", () => {
    let sam_data:any = [{user: {test: 'aaa'}}]
    new BrainSam(sam_data);
    expect(pixels[0]).toContain('u_test=aaa')
    sam_data.push({user: {test: 'bbb', test2: 'aaa'}})
    sam_data.push({event: 'custom_event'})
    expect(pixels[1]).toContain('u_test=bbb')
    expect(pixels[1]).toContain('u_test2=aaa')
  });

  test("it appends any data with domain, device, d prefix to d_* data points", () => {
    let sam_data:any = [{domain: {test: 'aaa'}}]
    new BrainSam(sam_data);
    expect(pixels[0]).toContain('d_test=aaa')
    sam_data.push({device: {test2: 'bbb'}, 'd.test3': 'www'})
    sam_data.push({event: 'custom_event'})
    expect(pixels[1]).toContain('d_test=aaa')
    expect(pixels[1]).toContain('d_test2=bbb')
    expect(pixels[1]).toContain('d_test3=www')
  });

  test("it appends any data with session, s prefix to s_* data points", () => {
    let sam_data:any = [{session: {test: 'aaa'}}]
    new BrainSam(sam_data);
    expect(pixels[0]).toContain('s_test=aaa')
    sam_data.push({session: {test2: 'bbb'}, s: {test3: 'www'}})
    sam_data.push({event: 'custom_event'})
    expect(pixels[1]).toContain('s_test=aaa')
    expect(pixels[1]).toContain('s_test2=bbb')
    expect(pixels[1]).toContain('s_test3=www')
  });

  test("it appends any data with event, e prefix to e_* data points", () => {
    let sam_data:any = [{event: {test: 'aaa'}}]
    new BrainSam(sam_data);
    expect(pixels[0]).toContain('e_test=aaa')
    sam_data.push({event: {test2: 'bbb'}, e: {test3: 'www'}})
    sam_data.push({event: 'custom_event'})
    expect(pixels[1]).toContain('e_test=aaa')
    expect(pixels[1]).toContain('e_test2=bbb')
    expect(pixels[1]).toContain('e_test3=www')
  });

  test("it appends any data with page, p prefix to p_* data points", () => {
    let sam_data:any = [{page: {test: 'aaa'}}]
    new BrainSam(sam_data);
    expect(pixels[0]).toContain('p_test=aaa')
    sam_data.push({page: {test2: 'bbb'}, p: {test3: 'www'}})
    sam_data.push({event: 'custom_event'})
    expect(pixels[1]).toContain('p_test=aaa')
    expect(pixels[1]).toContain('p_test2=bbb')
    expect(pixels[1]).toContain('p_test3=www')
  });

  test("it allows to add nested data with dot notation", () => {
    let sam_data:any = [{page: {test: 'aaa'}}]
    new BrainSam(sam_data);
    expect(pixels[0]).toContain('p_test=aaa')
    sam_data.push({'p.test': 'bbb', 'p.test2': 'ccc'})
    sam_data.push({event: 'custom_event'})
    expect(pixels[1]).not.toContain('p_test=aaa')
    expect(pixels[1]).toContain('p_test=bbb')
    expect(pixels[1]).toContain('p_test2=ccc')
  });
});


