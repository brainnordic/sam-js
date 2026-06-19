# sam.js API

## js api:
    <script type="text/javascript">
      window.sam_data = []
      sam_data.push({config: {sam_id: 'abcdef'})
    </script>
    <script src="https://cdn.dep-x.com/npm/brain-sam-js@1.0"></script>

**config options:**

    - **sam_id** - id of master sam
    - **autoview** - true/false - trigger page view on load, default: true
    - **observable** - undefined/location/function - trigger page view on each `observable` value change, default: undefined
    - **disable_3rd_party_cookies: true** - disable 3rd party cookie on dep-x.com domain
    - **disable_tracking_browser_data: true** - disable auto-tracking of browser data
    - **beacon: true** - send events via navigator.sendBeacon (falls back to the pixel if unsupported), default: false

**data layer:**

- any code on page can add extra data to internal data layer to send with sam pixel, if data will be present in data layer it will be added to all next events



- **Example:**
        <script type="text/javascript">
          sam_data.push({user: {zipcode: '12345'}) // puts data in internal data layer - it will be added to all events sent in current view session
          sam_data.push({event: 'order_completed', e_t: 'conversion'})
        </script>


- **Example2**
    <script type="text/javascript">
      window.sam_data = []
      sam_data.push({config: {sam_id: 'safdsaf'})
      sam_data.push({p_section: 'sport', d_pid: window.pubcid})
    </script>
    <script src="https://cdn.dep-x.com/npm/brain-sam-js@1.0"></script>

**Sending events:**
By default page view event is sent when sam.js is loaded, it can be changed with config value:

    <script type="text/javascript">
      window.sam_data = []
      sam_data.push({config: {sam_id: 'safdsaf', autoview: false})
    </script>
    <script src="https://cdn.dep-x.com/npm/brain-sam-js@1.0"></script>
    
    // in other place of code - eg. when page data loading is completed:
    <script type="text/javascript">
    sam_data.push({p_t: 'Sport event', p_section: 'sport', p_l: '/sport/event-post'})
    sam_data.push({event: 'pageview'})
    </script>

**Custom events:**
Developer can send any custom js triggered event, by putting it in sam_data layer, all data provided with event object will be included in pixel, but not stored in data layer for following events:

    // order form is displayed to the user
    <script type="text/javascript">
    sam_data.push({event: 'order_form', e_item_type: 'car'})
    </script>

**Non-navigational events:**
By default all events are counted in total page views, if you want just send data/event without putting it in total counts use event_type parameter:

    // order confirmed
    <script type="text/javascript">
      sam_data.push({event: 'order_completed', e_t: 'nonnavigational', e_amount: 122.22, e_currency: 'USD'})
    </script>

**Plugins:**
External code can register a plugin function by pushing it to the data layer. The function runs **once**, immediately when it is registered, and receives the data layer helper as its only argument. Use `data_layer.get(scope)` to read the current data layer model (for example `'user'`, `'session'`, `'page'`):


    <script type="text/javascript">
    sam_data.push({plugin: function(data_layer) {
     // runs once, at registration time
     var session = data_layer.get('session') || {} // read current data layer values

     // push additional data or wire up your own logic based on the data layer
     if(!session.campaign) {
       sam_data.push({session: {campaign: detectCampaign()}})
     }
    } })
    </script>

## pixel api:

**endpoint:** 

- https://sam.dep-x.com/e.gif

**data scopes:**

- user prefix: **u_**
- device/domain: **d_**
- session: **s_**
- event: **e_**
- page/view/resource: **p_**

**methods:**

1. /e.gif?n=SAM_ID&e=EVENT_NAME….
    1. **domain cookie:** buid=UUID
    2. **headers stored/processed:** client_ip, referrer, user_agent, accept_language
    3. **n** - SAM ID
    4. **e -** event name - default **page_view**
    5. **e_id** - event id - default **nil** - all data in events with the same id will be merged
    6. **e_t** - event type (**navigational, nonnavigational, data, user matching**) default: **nonnavigational** for events other then page_view - if event type is set to **navigational** it will be counted in total page views
    7. **p_cid**, **click_id** - click id.
    8. **d_id -** first party cookie: dep=UUID
    9. **d_pid** - publisher internal id, eg. pubcid
    10. **p_d** - page domain, default: window.location.host
    11. **p_l** - page location, default: window.location.href
    12. **p_r -** page referrer, default: document.referrer
    13. **p_t** - page title
    14. **dp_r** - device pixel ratio, default: window.devicePixelRatio
    15. **p_h** - current screen height, default: window.screen.height
    16. **p_w** - current screen width, default: window.screen.width
    17. **u_zipcode** - user zipcode
    18. **u_country** - user country, ISO 3166 ALPHA-3 code, default: swe
    19. **u_email** - user email - this is sensitive data, please contact us to establish encryption method
    20. **u_pnr** - user pnr - this is sensitive data, please contact us to establish encryption method
    21. **d_location** - current browser location format: latitude,longitude
    22. **s_campaign** - campaign name/id for current user session
    23. **p_section -** page section
    24. **e_amount** **-** conversion/event value
    25. **e_currency** - conversion value currency, default: EUR
    26. other/custom params: any other parameter with proper prefix (u_, d_, s_, p_, e_) will be stored in db for future usage, supported data types:
        1. integer
        2. float
        3. string (max 100 chars) [category/true/false etc]
        4. array of strings: [‘abc’, ‘def’, ‘xyz’] (maximum 20 elements, each max 20 chars)
        5. date - YYYY-MM-DD
        6. time - HH:MM(:SS) eg. 23:12, 12:34:01

# development

- `yarn build-all` - builds all scripts in /dist
- `yarn esbuild-browser:watch` - watches changes in sam.js code & builds browser version of js
- `yarn server` - runs web server with sam.js DEMO `http://localhost:8080/browser-test.html`
- `yarn test` - runs sam.js tests
- `yarn docs` - builds documentation
- `yarn publish` - publishes new version of sam.js