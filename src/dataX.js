// xo is tested to parse in an HTML5 browser.
// the resulting functions are backwards compatible
// The final site can run with the compiled js and dataX.js
// without needing to include the parser.

/*
 * xoBind JavaScript Library v0.0.0
 */
//function xoMainFn(window){

// Require string.trim
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

function DataX() {

  if (typeof window.dataX !== 'undefined'){
    //dataX is already loaded.
    return;
  }

  // TODO: preload language files
  this.lang['tonyb.views.Todo'] = {};
  this.lang['tonyb.views.Todo']['spa']={
    //input_title: "¿Qué hay que hacer?",
    input_title: [1508378547,"¿Qué hay que hacer?"],
    mark_complete:[0,"Marcar todos como completa"],
    all:[0,"Todo"],
    active:[0,"Activo"],
    completed:[0,"Terminado"],
    clear_completed:[0,"Borrar {0}"]
  };

  this.locale = "eng";
  // use getByAttr for this browser
  this.getByAttr = ('querySelectorAll' in document) ? this.getByAttrQS : this.getByAttrFB;
  this.queueSet = []; // collection of [varname, val, skip]
  this.isReady = false;
  this.ids = {};
  this.refId = 0;
  this.refCleanupTimeout = null;
  this.refCleanupRate = 1000;
  this.inst = [];
  this.readyQueue = [];
  this.lang = {};

  window.dataX = this;
}

// parse dot notation into last object and key.
// This can be used to parse a string in such a way
// that it can reference an object.  The dot parser
// performs better than an eval but it can't handle
// brackets.
DataX.prototype.dot = function(varName,autoCreate) {
  autoCreate = (autoCreate === true || autoCreate === 1);
  var parts = varName.split('.');
  var len = parts.length-1;
  var obj = null;
  var key = null;

  if (len === 0) {
    obj = window;
    key = parts[0];
  } else {
    obj = window[parts[0]];
    key = parts[len]; // last part is key
    if (autoCreate && typeof obj === "undefined") {
      obj = window[parts[0]] = {}
    }
    for (var i = 1; i < len; i++) {
      obj = obj[parts[i]];
      if (autoCreate && typeof obj === "undefined") {
        obj = obj[parts[i]] = {}
      }
    }
  }

  if (autoCreate && typeof obj[key] === "undefined") {
    obj[key] = {}
  }
  return {obj: obj, key: key};
};

// Return true when enter is key is pressed.
DataX.prototype.enter = function(event) {
  var e = event || window.event;
  var key = (e.charCode) ? e.charCode : e.keyCode;
  return (key === 13) ? true : false;
};


/*
  // srcPath - Retrurn the first path that ends with 'name'
  dataX.srcPath = function(name) {
    var els = document.getElementsByTagName('script'),
      len = els.length,
      re = new RegExp(name.replace('.','\\.')+ '$'),src;
    while (len--) {
      src = els[len].src;
      if (src && src.match(re)) {
        return src.replace(re,'');
      }
    }
    return null;
  };
*/
// dataX.set is used to update vars bound to a view.
// dataBind(varName, val{optional}, skip{optional})
// skip is used in forms when updating input so we can skip binding back.
// Sets the value of varName and updates elements bound to varName.
DataX.prototype.set = function(varName, val, skip, noqueue) {

  // TODO: on dataX.set add key for variable
  // name. Subsequent dataX.set commands can look for attached name
  // when the set is an object.

  // set val so that bind functions will work on load
  if(typeof val !== 'undefined') {
    try {
      // NOTE: selector can not have bracket notation.
      // myvar.0.1.2 = myvar[0][1][2]

      var v2 = varName.indexOf('.') === -1 ? 'window.'+varName : varName;

      var d = this.dot(v2,true);
      d.obj[d.key] = val;
    } catch (err) {
      console.log('Error setting value.' + err);
    }
  }

  if(!noqueue && !this.isReady) {
    this.queueSet.push([varName, val, skip]);
    return;
  }
  
  // TODO: initial binds should register elements for updates. searching the doc shouldn't be needed.
  var bindToElements = this.getByAttr(document, '[data-x-bindto="' + varName + '"]');

  if (typeof bindToElements === 'undefined' || bindToElements.length===0) {
    console.log('no binds for ' + varName);
    return;
  }

  for (var i = 0, len = bindToElements.length; i < len; i++) {
    var el = bindToElements[i];
    if(el === skip) continue;
    var bindFn = el.getAttribute('data-x-bindfn');

    // If we have new references then schedule cleanup.
    var refIdStart = this.refId;

    if (bindFn.indexOf('_view_') !== -1) {
      // Wire to the view instance.
      var data_x_id = el.getAttribute('data-x-id');
      bindFn = bindFn.replace('_view_', data_x_id);
    } else {
      var data_x_id = null;
    }
  
    var d = this.dot(bindFn);
    var fn = d.obj[d.key];

    if (typeof fn === "undefined") {
      console.log(bindFn + ' does not exist');
      continue;
    } else {
      console.log('bindfn=' + bindFn);
    }
    
    var newHTML = d.obj[d.key]();
    var numRefs = this.refId - refIdStart;
    
    if (numRefs > 0) {
      // New references. Replaced element most likely had references.
      // Schedule cleanup if not scheduled.
      //dataX.ref.cleanup();
      //TODO: Cleaning up references is zapping required reference
      //variables that are part of the template code.  For instance
      //completed R5_ will get zapped on a redraw where nothing is
      //marked completed. We need this reference to stick.
      //The template code also needs a domain for reference variables
      //to avoid collisions with other templates.
    }

    // TODO: if we create the element within the bind we can register it for a bind
    // lookup that doesn't need to search the dom. Render functions that use this.bind_n
    // may need to have standin elements that are replaced after render.
    // var el = this.bind_0(); RET += "<div data-x-standin=\"" + el.getAttribute('data-x-id') + '"></div>'
    var newElement = this.createElement(newHTML);

    if (data_x_id !== null) {
      newElement.setAttribute('data-x-id', data_x_id);
    }

    if (el.hasAttribute('data-x-render')) {
      var fnRender = el.getAttribute('data-x-render');
      var d = this.dot(fnRender);
      //window[fnRender](el, newElement);
      d.obj[d.key](el, newElement);
    } else {
      el.parentNode.replaceChild(newElement, el);
    }
  }
};

// Set elements bound to an array item.
// example. dataX.setItem('my.obj.arr', 1); // referesh all my.obj.arr[1] items.
DataX.prototype.setItem = function(strVar, index, value) {

  var dotItem = this.dot(strVar);
  index = index.toString();

  if (typeof value !== "undefined") {  
    dotItem.obj[dotItem.key][index] = value;
  }

  var elements = this.getByAttr(document, '[data-x-bindto="' + strVar + '"]');

  // Find bind functions for each element, render, and replace.
  var len = elements.length;

  for (var i = 0; i < len; i++) {
    var el = elements[i];
    // search for a child with this index.
    var itemNode = null;
    var childNodes = el.childNodes;
    for (var j = 0, jlen=childNodes.length; j < jlen; j++) {
      var child = childNodes[j];
      if (child.nodeType === 1 &&
        child.hasAttribute("data-x-index") &&
        child.getAttribute("data-x-index") === index) {
          itemNode = child;
          break;
      }
    }

    if (itemNode !== null) {
      // foudn this item.. render it.
      var bindfn = el.getAttribute("data-x-bindfn");
      var d = this.dot(bindfn);
      var newHTML = d.obj[d.key](index).trim();
      var newElement = this.createElement(newHTML);
      el.replaceChild(newElement, child);
    }
  }
};

// find parent with tagName of tag
DataX.prototype.getParent = function(el, tag, isXML) {
  tag = (isXML !== true) ? tag.toUpperCase() : tag;
  while ((el=el.parentElement) && el.tagName!==tag);
  return (el.tagName === tag) ? el : null;
};

// Returns true if c is a child of p else returns false;
DataX.prototype.childOf = function(c, p){
  while((c=c.parentNode)&&c!==p); 
  return !!c; 
};

DataX.prototype.getTarget = function(e) {
  if (!e) var e = window.event;
  var target = (e.target) ? e.target : e.srcElement;
  if (target.nodeType == 3) {// defeat Safari bug
    target = target.parentNode;
  }
  return target;
};

// querySelector getbyattr
DataX.prototype.getByAttrQS = function (el, q) {
  return el.querySelectorAll(q);
};

// fallback getbyattr can do q="tag[attr='value']", q='[attr]', and q='[attr="value"]'
DataX.prototype.getByAttrFB = function (el, q) {
  var attrStart = q.indexOf('[');
  var attrEnd = q.indexOf(']',attrStart);
  var tagName = (attrStart === 0) ? '*' : q.substring(0,attrStart);
  var eq = q.indexOf('=');
  if (eq > -1) {
    var attrOnly = false;
    var attr = q.substring(attrStart+1,eq);
    var value = q.substring(eq+1,attrEnd);
    var first = value.charAt(0);
    if (first === '"' || first === "'") {
      // strip quotes
      value = value.substring(1,value.length-1);
    }
  } else {
    var attr = q.substring(attrStart+1,attrEnd);
  }

  var found = [];
  var tags = el.getElementsByTagName(tagName);
  var attrOnly = (typeof value === "undefined") ? true : false;

  for (var i = 0, len = tags.length; i < len; i++) {
    // getAttribute returns null or empty string depending on browser
    // Do not use data- attributes with empty values.
    var attrValue = tags[i].getAttribute(attr);
    if (attrValue !== null && attrValue !== "") {
      if (eq === -1 || attrValue == value) {
        found.push(tags[i]);
      }
    }
  }

  return found;
};

// get first html tag from el
DataX.prototype.getFirstTag = function(el) {
  //check if the first node is an element node
  var c = el.firstChild;
  while (c.nodeType!=1) {
    c = c.nextSibling;
  }
  return c;
};

DataX.prototype.createElement = function(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  return div.firstChild;
};

DataX.prototype.afterParse = function() {
// script source is loaded as new tag. this allows us to debug in chrome. (doesn't work in firefox)
// we need to wait for the source to load before running init.
// this loop will keep checking until load is complete or max attempts.
  // se dataX.parse
  if (this.parsing!==0 && this.parseWait++<this.parseWaitMax){
    console.log(this.parsing)
    this.parseWait++;
    setTimeout(afterParse,10); // check every 10ms for parsing completion
    return;
  } else if(this.parseWait>=this.parseWaitMax) {
    console.log('waited too long for parse source to load');
    return;
  }
  var initElements = document.querySelectorAll('[data-x-ctrl]');

  for (var i = 0, len = initElements.length; i < len; i++) {
    // the eval needs access to the element 'el';
    // Using dot method to access objects, seems safer than eval.
    var el = initElements[i];
    var ctrlName = el.getAttribute('data-x-ctrl');

    if (el.hasAttribute('data-x-view')) {
      var viewName = el.getAttribute('data-x-view');
    } else {
      var viewName = el.getAttribute('data-x-viewtype');
    }

    var d = this.dot(viewName);
    var view = d.obj[d.key];
    
    if (ctrlName === "" || ctrlName === "null") {
      ctrl = null
    } else {
      var d2 = this.dot(ctrlName);
      var ctrl = d2.obj[d2.key];
      if(ctrl)ctrl._ctrl_=ctrlName;
    }

    var id = el.hasAttribute('id') ? el.getAttribute('id') : el.tagName;

    if (ctrlName === "") ctrlName = 'null';

    var str = 'new ' + viewName + '("' + id + '", ' + ctrlName + ', true) ';

    try {
      var v = new view(el,ctrl,true);
      console.log(str + v.id);
    } catch(err) {
      console.log('ERROR: ' + str);
      console.log(err);
    }
    
  } 

  // Items may still be queueing while loop is going on..
  // check length every time.
  for (var i = 0; i < this.queueSet.length; i++) {
    var item = this.queueSet[i];
    this.set(item[0],item[1],item[2], true); // add true to bypass re-qeueue
  }
  this.queue = [];
  this.isReady = true;
};

DataX.prototype.init = function() {
  this.parsing=0;
  if (typeof this.parse !== "undefined") {
    // TODO: make sure parser is not required for deployment
    this.parse.init();
  }

  this.parseWaitMax = 1000;
  this.parseWait=0;
  this.afterParse();

  for(var i=0,len=this.readyQueue.length;i<len;i++){
    this.readyQueue[i]();
  }
  this.readyQueue = "";
};

  /*** UTILITY FUNCTIONS ***/

  // htmlEncode - encodes &, <, >, ", and ' to HTML entities &..;
  // Values can be inserted as attribute value or text without breaking HTML.

DataX.prototype.htmlEncode = function(s) {
  s = s + ''; // make string
  var map = {
    "&": "&amp;",
    "'": "&#39;",
    '"': "&quot;",
    "<": "&lt;",
    ">": "&gt;"
  };
  return s.replace(/[&"'\<\>]/g, function(c){return map[c]});
};

DataX.prototype.htmlDecode = function(s) {
  s = s + '';
  var map = map = {
    "amp": "&",
    "#39": "'",
    "quot": '"',
    "lt": "<",
    "gt": ">"
  };
  return s.replace(/&(amp|quot|lt|gt|(#)([0-9]*));/g, function(match,$1,$2,$3){
    if ($2 === '#') {
        return String.fromCharCode(Number($3));
    } else {
        return map[$1];
    }
  });
};


// namespace - automatically build name1.name2.name3 = value.
// This function will create a namespace if it doesn't exist
// and set the value.  For example
// dataX.namespace('myNamespace.obj.member', 'myvalue');
// Creates window.myNamespace
// Creates window.myNamespace.obj
// Sets window.myNamespace.obj = 'myvalue';
DataX.prototype.namespace = function (n,v) {
  var o = window;
  var parts = n.split(".");
  var len = (parts.length - 1);

  // loop through all but the last part
  for(var i = 0; i < len; i++) {
    var p = parts[i];
    // set the current object to the existing object if
    // it exists else create a new object.
    o = (p in o) ? o[p] : o[p] = {};
  }
  
  // Set a value if it exists else create an object for the last part.
  o[parts[i]] = (typeof v !== 'undefined') ? v : {};
};

  /*
  References.
  When looping through objects in a collection you may want to create a reference to
  the object to make sure your function will act on the object regardless of what
  happens to the collection. Can be usefull for collections that get reordered.

  In xo a reference has the name dataX.refs.Rn_ where n is the reference id number.
  Periodically a cleanup occurs that clears dataX.refs that are not in the document. Refs
  are meant to be used for javascript events which run in a different scope.
  */

  // set and return a reference
  // data-el-onclick="myfunc(this, {#item});"


DataX.prototype.ref = function(obj) {
  var id = 'R' + this.refId++ + '_';
  this.ids[id] = obj;
  return "dataX.ids." + id;
};

DataX.prototype.refCleanup = function() {
  // schedule cleanup if not already scheduled.
  if (this.refCleanupTimeout === null) {
    this.refCleanupTimeout = setTimeout(this.refCleanupNow, this.refCleanupRate);
  }
};

DataX.prototype.refCleanupNow = function() {
  // Clear timeout in case of forced cleanup.
  clearTimeout(this.refCleanupTimeout);

  // Find all refs (dataX.refs.Rnn_) and add to keep.
  var markup = document.documentElement.innerHTML;
  var keep = {};    
  markup.replace(/dataX\.ids\.(R[0-9]*_)/g, function(match, $1) {
    keep[$1] = this.ids[$1];
  });
  
  // Reset refs to only refs in doc.
  this.ids = keep;

  // Each dataX.set schedules a cleanup.
  // Alternately we could schedule a cleanup here when refs.length > 0
  this.refCleanupTimeout = null;
};

// make app.controller.list[index] HTML id compatible
// converts to app.controller.list.index
DataX.prototype.item = function(str) {
  return str.replace(/\[([0-9]*)\]/g, ".$1");
};

  
DataX.prototype.instance = function(obj) {
    this.inst.push(obj);
    return 'dataX.inst.' + (this.inst.length-1);
};


// loads language dictionary into view namespace.
// allows for loading dictionary before class is declared.
DataX.prototype.loadLanguage = function(ns, msg) {
  if (typeof this.lang[ns] === 'undefined') {
    return;
  }

  var lang = this.lang[ns];
  for (locale in lang) {
    if (typeof msg[locale] === 'undefined') {
      msg[locale] = lang[locale];
    } else {
      for (key in lang[locale]) {
        msg[locale][key] = lang[locale][key];
      }
    }
  }
};

DataX.setLocale = function(locale) {
  //TODO: replace _ctrl_ in output with view._ctrl_
  this.locale=locale;
  var views = this.getByAttr(document,'[data-x-id]');
  for (var i = 0, viewsLen=views.length; i < viewsLen; i++) {
    var viewEl = views[i];
    var refId = viewEl.getAttribute('data-x-id');
    console.log("refId=" + refId);
    var d = this.dot(refId);
    var view = d.obj[d.key];
    var msgs = this.getByAttr(viewEl,'[data-x-msg]');

    for (j=0,jlen=msgs.length; j < jlen; j++) {
      var el = msgs[j];
      var keys = el.getAttribute('data-x-msg').split(',');
      for (var k=0, klen=keys.length; k < klen; k++) {
        var pair = keys[k].split(':');
        if (pair.length === 2) {
          msgs[j].innerHTML = view.content(locale,pair[0],pair[1]);
        } else if(pair.length === 3) {
          msgs[j].setAttribute(pair[1], view.content(locale,pair[0],pair[2]));
        }
      }
    }
  }
};

DataX.prototype.ready = function(fn) {
  if(typeof fn !== "function") {
    var msg ='dataX.ready: Expected type "function" and instead recieved type "' + typeof(fn) + '".';
    console.error(msg)
  } else {
    this.readyQueue.push(fn);
  }
};

DataX.prototype.outerHTML = function(el){
  if(el.outerHTML)return el.outerHTML;
  if(typeof this.xser === "undefined") this.xser=new XMLSerializer();
  return this.xser.serializeToString(el).replace(/ xmlns="[^"]*"/,"");
};

/*
  dataX.ctrl = function(ns, obj) {
    obj._ctrl_=ns; // used to replace _ctrl_ with the namespace
    dataX.namespace(ns,obj);
  };
*/

/*
  gets data-attr from element or sets default value
  the returned keys are camelCased with the data-
  prefix removed. Example data-my-var="myValue"
  returns as data.myVar="myValue"
*/
DataX.prototype.getData = function(el, defaults) {
  if (this.isArray(defaults)) {
    // set defaults to null
    var temp = defaults
    defaults = {}
    for (var i=temp.length;i--;) defaults[temp[i]] = '';
  }
  var data = {};

  for(k in defaults) {

    if (el.hasAttribute(k)) {
      var v = el.getAttribute(k);
    } else {
      var v = defaults[k];
    }

    k=k.substr(5).replace(/-(.)/g, function(m,$1){
      return $1.toUpperCase();
    });

    data[k] = v;
  }
  return data;
};

DataX.prototype.isArray = function(obj) {
  return (Object.prototype.toString.call(obj) === '[object Array]');
};

DataXException = function (message) {
  return {message:message, type: "XO Exception"};
};

DataXException.prototype.toString = function() {
  return this.type + ': ' + this.message;
};

new DataX();
