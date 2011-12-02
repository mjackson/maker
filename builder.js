// An HTML builder, built to work on jQuery objects
// Very much a work in progress: tags and attributes you might want are almost certainly missing, so add as needed.
//
// Example:
//
// $('#myContainer').build(function(html) {
//   html.div('someClassName')
//     .text('Some text');
//   html.div('someOtherClass')
//     .div('nestedDiv')
//       .div('doublyNested');
// });
//
// Call $someElement.build(function(html) { ... }) with a builder function as the single argument.
//  - The builder function receives an html object which has methods for each tag.
//  - Each tag method takes a CSS class name as its single argument.
//  - Tags can call tags: html.div().span()
//  - Tags can call attribute methods to set attributes: html.a().href('http://...')
//  - Tags can call handler methods to trigger events. These map to jQuery events, e.g. html.a().click(...)
//  - The handler .later(function($element) {}) executes a function with the element as an argument once the element has actually been built
//  - Tags can call .text('some text') to set text content, or .raw("won't be escaped") to avoid escaping.
//    - Calling either of these prevent the tag from having any children.
//  - Tags can call .map(array, function(item, childTag) { ... }) to iterate over an array using a builder callback.
//    - The map builder callback takes two arguments: the current item in the array, and a child tag.
//    - Where it makes sense, map will create the "right" child element (e.g. <ul> begets <li>), or
//      it will default to <div>
//  - The html object has a makeRegistry() method which returns an object in which you can store elements that will be filled-in once built.
//
//     var registry;
//     $('#myContainer').build(function(html) {
//       registry = html.makeRegistry();
//       registry.myDiv = html.div('myDiv');
//     });
//
//     - then, later on:
//
//     registry.myDiv.css({ ... });

jQuery.fn.build = (function(){
  var tagNames = [
    "div", "span", "strong", "em",
    "table", "tr", "td", "tbody", "th", "thead",
    "ul", "li",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "form","select","option","optgroup","input","button","fieldset","legend","label",
    "a", "img",
    "p"
  ];
  var attrNames = [
    "id","style",
    "colspan",
    "selected","value",
    "title",
    "href",
    "width",
    "height",
    "src",
    "action",
    "method",
    "type",
    "name",
    "checked",
    "multiple",
    "size",
    "placeholder"
  ];
  var handlerNames = [
    "click", "mouseover", "mouseout", "mouseenter", "mouseleave", "change", "mousedown", "mouseup", "mousemove",
    "append", "later",
    "hide", "show"];

  var counter = 0;

  function Builder() {
    this.stack = [];
    this.snippets = [];
    this.registries = [];
    this.handlers = {};
  }

  function Tag(builder, name) {
    this.builder = builder;
    this.tagName = name;
    this.attrs = {};
    this.opened = false;
  }

  Builder.prototype.makeRegistry = function() {
    var registry = {};
    this.registries.push(registry);
    return registry;
  };

  Builder.prototype.text = function(str, parent) {
    this.popTo(parent);
    this.writeEscaped(str);
  };

  Builder.prototype.raw = function(str, parent) {
    this.popTo(parent);
    this.write(str);
  };

  Builder.prototype.autoLink = function(str, parent) {
    this.raw(twttr.txt.autoLink(str, {urlClass: 'linkified'}), parent);
  };

  Builder.prototype.tag = function(name, args, parent) {
    this.popTo(parent);
    var tag = new Tag(this, name);
    this.stack.push(tag);
    tag.extraArguments.apply(tag, args);
    return tag;
  };

  Builder.prototype.popTo = function(tag) {
    while(this.top() && this.top() !== tag) {
      this.stack.pop().close();
    }
  };

  Builder.prototype.top = function() {
    return this.stack[this.stack.length - 1];
  };

  Builder.prototype.write = function(str) {
    this.snippets.push(str);
  };

  Builder.prototype.escapeMap = {
     '<': '&lt;',
     '>': '&gt;',
     '"': '&#34;',
     "'": '&#39;'
  };

  Builder.prototype.writeEscaped = function(str) {
    var self = this;
    str = String(str);
    this.write(str.replace(/[<>'"]/g, function(c) { return self.escapeMap[c]; }));
  };

  Builder.prototype.read = function() {
    this.popTo(null);
    return this.snippets.join("");
  };

  Builder.prototype.registerHandler = function(id, event, fn) {
    if(!this.handlers[id]) {
      this.handlers[id] = {};
    }
    this.handlers[id][event] = fn;
  };

  Builder.prototype.install = function() {
    var byID = {};
    this.registries.forEach(function(registry) {
      var id;
      var map;
      for(var key in registry) {
        if (registry.hasOwnProperty(key)) {
          id = registry[key].attrs.id;
          map = byID[id];
          if (!map) {
            map = byID[id] = {};
          }
          map[key] = registry;
        }
      }
    });

    var element, map, handlers;

    for (var id in byID) {
      if (byID.hasOwnProperty(id)) {
        element = $("#" + id);
        map = byID[id];
        for (var key in map) {
          if (map.hasOwnProperty(key)) {
            map[key][key] = element;
          }
        }
      }
    }

    for (var handlerId in this.handlers) {
      if (this.handlers.hasOwnProperty(handlerId)) {
        element = $("#" + handlerId);
        handlers = this.handlers[handlerId];
        for (var attr in handlers) {
          if (handlers.hasOwnProperty(attr)) {
            element[attr](handlers[attr]);
          }
        }
      }
    }
  };

  Tag.prototype.makeRegistry = function() {
    return this.builder.makeRegistry();
  };

  Tag.prototype.extraArguments = function(arg1) {
    if(typeof(arg1) === "string") {
      this.addClass(arg1);
    }
  };

  Tag.prototype.open = function() {
    if(this.opened) {
      return;
    } else {
      this.opened = true;
    }

    this.ensureID();

    this.builder.write("<");
    this.builder.write(this.tagName);
    var val;
    for (var attr in this.attrs) {
      if (this.attrs.hasOwnProperty(attr)) {
        val = this.attrs[attr];
        this.builder.write(" ");
        this.builder.write(attr);
        this.builder.write("='");
        this.builder.writeEscaped(val);
        this.builder.write("'");
      }
    }
    this.builder.write(">");
  };

  Tag.children = {
    thead: 'tr',
    tbody: 'tr',
    tr: 'td',
    ul: 'li',
    select: 'option'
  };

  Tag.prototype.mapTag = function(array, child, fn) {
    this.open();
    var self = this;
    array.forEach(function(item, i) {
      fn(item, self.builder.tag(child, [], self), i);
    });
  };

  Tag.prototype.map = function(array, fn) {
    var child = Tag.children[this.tagName] || 'div';
    this.mapTag(array, child, fn);
    return this;
  };

  Tag.prototype.close = function() {
    this.open();
    this.builder.write("</");
    this.builder.write(this.tagName);
    this.builder.write(">");
  };

  Tag.prototype.text = function(str) {
    this.open();
    this.builder.text(str, this);
    return this;
  };

  Tag.prototype.raw = function(str) {
    this.open();
    this.builder.raw(str, this);
    return this;
  };

  Tag.prototype.space = function() {
    this.span().text(' ');
    return this;
  };

  Tag.prototype.autoLink = function(str) {
    return this.raw(twttr.txt.autoLink(str, {urlClass: 'linkified'}));
  };

  Tag.prototype.loggedClick = function(obj, fn) {
    obj.event_name = "click";
    return this.click(function(){
      scribe(obj, "peacock");
      return fn.apply(this, arguments);
    });
  };

  Tag.prototype.attr = function(attr, val) {
    if (typeof(attr) === 'object') {
      // if attr is an object, assume it's a collection of attribute names and values
      for (var ka in attr) {
        if (attr.hasOwnProperty(ka)) {
          this.attrs[ka] = attr[ka];
        }
      }
    } else {
      if (typeof(val) === 'object') {
      // if value is an object, assume it's a collection of CSS-type properties
      // and build them into CSS syntax in a string
        var replaceValue = '';
        for (var kv in val) {
          if (val.hasOwnProperty(kv)) {
            replaceValue += kv.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + val[kv] + ';';
          }
        }
        val = replaceValue;
      }
      this.attrs[attr] = val;
    }
    return this;
  };

  Tag.prototype.handler = function(event, fn) {
    this.builder.registerHandler(this.ensureID(), event, fn);
    return this;
  };

  Tag.prototype.ensureID = function() {
    if (this.attrs && this.attrs.id) {
      return this.attrs.id;
    } else {
      var id = "id" + counter++;
      this.attrs.id = id;
      return id;
    }
  };

  Tag.prototype.addClass = function(str) {
    if(this.attrs["class"]) {
      this.attrs["class"] = this.attrs["class"] + " " + str;
    } else {
      this.attrs["class"] = str;
    }
    return this;
  };

  Tag.prototype.addClassIf = function(str, bool) {
    if (bool) {
      this.addClass(str);
    }
    return this;
  };

  tagNames.forEach(function(name) {
    Builder.prototype[name] = function() {
      return this.tag(name, arguments, null);
    };
    Tag.prototype[name] = function() {
      this.open();
      return this.builder.tag(name, arguments, this);
    };
  });

  handlerNames.forEach(function(name) {
    Tag.prototype[name] = function(fn) {
      return this.handler(name, fn);
    };
  });

  attrNames.forEach(function(name) {
    Tag.prototype[name] = function(val) {
      return this.attr(name, val);
    };
  });

  return function(fn) {
    var builder = new Builder();
    fn(builder);
    this.append(builder.read());
    builder.install();
    return this;
  };
})();

jQuery.fn.later = function(callback) {
  callback(this);
  return this;
};
