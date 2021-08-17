# development

- `yarn build-all` - builds all scripts in /dist
- `yarn esbuild-browser:watch` - watches changes in sam.js code & builds browser version of js
- `yarn server` - runs web server with sam.js DEMO `http://localhost:8080/browser-test.html`
- `yarn test` - runs sam.js tests
- `yarn docs` - builds documentation
- `yarn publish` - publishes new version of sam.js

# sam.js API

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
    6. **e_t** - event type (**navigational, nonnavigational, data, user matching**) default: **navigational** - will be counted in total page views
    7. **p_cid**, **click_id** - click id.
    8. **d_id -** first party cookie: dep=UUID
    9. **d_pid** - publisher internal id, eg. pubcid
    10. **p_d** - page domain, default: window.location.host
    11. **p_l** - page location, default: window.location.href
    12. **p_r -** page referrer, default: document.referrer
    13. **p_t** - page title
    14. **d_pr** - device pixel ratio
    15. **d_h** - current sceen height, default: window.screen.height
    16. **d_w** - current sceen width, default: window.screen.height
    17. **u_zipcode -** user zipcode 
    18. **u_email** - user email - this is sensitive data, please contact us to establish encryption method
    19. **u_pnr** - user pnr - this is sensitive data, please contact us to establish encryption method
    20. **d_location** - current browser location format: latitude,longitude
    21. **s_campaign** - campaign name/id for current user session
    22. **p_section -** page section
    23. **e_amount** **-** conversion/event value
    24. **e_currency** - conversion value currency, default: EUR
    26. other/custom params: any other parameter with proper prefix (u_, d_, s_, p_, e_) will be stored in db for future usage, supported data types:
        1. integer
        2. float
        3. string (max 100 chars) [category/true/false etc]
        4. array of strings: [‘abc’, ‘def’, ‘xyz’] (maximum 20 elements, each max 20 chars)
        5. date - YYYY-MM-DD
        6. time - HH:MM(:SS) eg. 23:12, 12:34:01



## js api:
    <script type="text/javascript">
      window.sam_data = []
      sam_data.push({config: {sam_id: 'abcdef'})
    </script>
    <script src="https://cdn.jsdelivr.net/npm/brain-sam-js@0.0.3/dist/esbuild/sam.min.js"></script>

**config options:**

    - **sam_id** - id of master sam
    - **autoview** - true/false - trigger page view on load, default: true
    - **observable** - undefined/location/function - trigger page view on each `observable` value change, default: undefined

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
    <script src="https://cdn.jsdelivr.net/npm/brain-sam-js@0.0.3/dist/esbuild/sam.min.js"></script>

**Sending events:**
By default page view event is sent when sam.js is loaded, it can be changed with config value:

    <script type="text/javascript">
      window.sam_data = []
      sam_data.push({config: {sam_id: 'safdsaf', autoview: false})
    </script>
    <script src="https://cdn.jsdelivr.net/npm/brain-sam-js@0.0.3/dist/esbuild/sam.min.js"></script>
    
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

**Event plugins:**
any external code can register plugin that is listening to all incoming events and has ability to modify data before sending it to server:


    <script type="text/javascript">
    sam_data.push({plugin: function(event_id, event_object, data_layer) {
     //this function will be called every time when event is about to send
    
     if(event_object.event == 'order_completed') {
       fetch_some_extra_data(event_object.order_id, function(data) {
         sam_data.push(event_object.merge({e_id: event_id, e_order_status: data.status}))
         // add extra data to event when available
       })
     }
     // update data layer before sending event
     total_amount = data_layer.get('s_total_amount') || 0.0
     data_layer.set('s_total_amount', total_amount + e.amount)
     
     // update event_data
     event_object.e_date = fetchDate()
    } })
    </script>

**Data layer listener:**
By registering data layer listener you can modify/expand input data before is included in data layer OR trigger custom events based on data layer values


    <script type="text/javascript">
    sam_data.push({processor: function(incoming_data, data_layer) {
     if(incoming_data.amount) { 
       total_amount = data_layer.get('s_total_amount') || 0.0
       return {total_amount: total_amount + incoming_data.amount} 
       // sam_data.push({amount: 123.00)} - data layer = {total_amount: 123.00}
       // sam_data.push({amount: 12)} - data layer = {total_amount: 135.00}
      }
      // sam_data.push({other: 'abc')} - data layer = {total_amount: 135.00, other: 'abc'}
    } })
    </script>


