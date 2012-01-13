(function ($, undefined) {

    var guid = 1;

    // All known HTML tag names, per http://dev.w3.org/html5/spec/Overview.html.
    var tagNames = "a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup command data datalist dd del details dfn div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr i iframe img input ins kbd keygen label legend li link map mark menu meta meter nav noscript object ol optgroup option output p param pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td textarea tfoot th thead time title tr track u ul var video wbr".split(" ");
    // All known HTML attribute names, per http://dev.w3.org/html5/spec/Overview.html.
    var attrNames = "accept accept-charset accesskey action alt async autocomplete autofocus autoplay border challenge charset checked cite class cols colspan content contenteditable contextmenu controls coords crossorigin data datetime default defer dir dirname disabled draggable dropzone enctype for form formaction formenctype formmethod formnovalidate formtarget headers height hidden high href hreflang http-equiv icon id ismap keytype kind label lang list loop low manifest max maxlength media mediagroup method min multiple muted name novalidate open optimum pattern placeholder poster preload radiogroup readonly rel required reversed rows rowspan sandbox scope scoped seamless selected shape size sizes span spellcheck src srcdoc srclang start step style tabindex target title type typemustmatch usemap value width wrap".split(" ");
    // All known jQuery event names, per jQuery 1.7.
    var eventNames = "blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" ");

    var escapeMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;'
    };

    /**
     * Escapes all special HTML characters in the given `string`.
     */
    function escapeHTML(string) {
        if (string == null) {
            return "";
        }

        return String(string).replace(/&(?!\w+;)|[<>"']/g, function (s) {
            return escapeMap[s] || s;
        });
    }

    var div = document.createElement("div");

    /**
     * Creates a DOM element from the given string of `html`.
     */
    function makeDom(html) {
        div.innerHTML = html;
        return div.firstChild;
    }

    function makeMaker(tagName, attributes, callback) {
        if (arguments.length === 1) {
            attributes = {};
        } else if (typeof attributes === "function") {
            callback = attributes;
            attributes = {};
        }

        var maker = new Maker(tagName, attributes);

        if (typeof callback === "function") {
            callback(maker);
        }

        return maker;
    }

    function Maker(tagName, attributes) {
        if (typeof attributes === "string") {
            attributes = {"class": attributes};
        }

        this.tagName = tagName || "div";
        this.attributes = attributes || {};
        this.children = [];
        this.events = [];
    }

    /**
     * Creates a new Maker, appends it as a child of this Maker, and returns
     * this Maker. See makeMaker.
     */
    Maker.prototype.make = function (tagName, attributes, callback) {
        var maker = makeMaker(tagName, attributes, callback);
        this.children.push(maker);
        return maker;
    };

    /**
     * Sets the attribute with the given `name` and returns this Maker.
     */
    Maker.prototype.attr = function (name, value) {
        this.attributes[name] = value;
        return this;
    };

    /**
     * Set inner text.
     */
     Maker.prototype.text = function (value) {
         this._text = value;
         return this;
     };

     /**
      * Set inner HTML.
      */
     Maker.prototype.html = function (value) {
         this._html = value;
         return this;
     };

    /**
     * Adds a class name to any previous value that may already exist and
     * returns this Maker.
     */
    Maker.prototype.addClass = function (value) {
        var className = this.attributes["class"];

        if (className) {
            value = className + " " + value;
        }

        return this.attr("class", value);
    };

    /**
     * Binds the event with the given `name` and returns this Maker.
     */
    Maker.prototype.bind = function (name, data, handler) {
        this.events.push(arguments);
        return this;
    };

    /**
     * Sugar for bind.
     */
    Maker.prototype.on = Maker.prototype.bind;

    var childMap = {
        "ol": "li",
        "ul": "li",
        "table": "tr",
        "thead": "tr",
        "tbody": "tr",
        "tr": "td",
        "select": "option"
    };

    /**
     * Used to easily create one child Maker for each element of the given
     * `array`, the tagName of which is determined by this Maker's tagName. For
     * example, if this Maker is a "ul", the child will be an "li". Likewise, a
     * "select" yields "option" elements, etc.
     *
     * The callback is called with three arguments: 1) the item in the array, 2)
     * the new child Maker object and 3) the index of the item in the original
     * array. Returns this Maker.
     *
     *     ul.map(items, function (item, li, index) {
     *         // ...
     *     });
     */
    Maker.prototype.map = function (array, callback) {
        var tagName = childMap[this.tagName] || "div";

        for (var i = 0, len = array.length; i < len; ++i) {
            callback(array[i], this.make(tagName), i);
        }

        return this;
    };

    /**
     * Returns an array of tokens that represent the HTML markup of this Maker.
     * All arguments are for internal use only.
     */
    Maker.prototype.toMarkup = function (events, markup) {
        markup = markup || [];

        markup.push("<", this.tagName);

        if (events && this.events.length) {
            var id = this.attributes.id;

            // Make sure this element has an id.
            if (!id) {
                id = this.attributes.id = "maker-" + guid++;
            }

            // Store the events for this element in the events map.
            events[id] = this.events;
        }

        for (var name in this.attributes) {
            markup.push(" ", name, '="', escapeHTML(this.attributes[name]), '"');
        }

        markup.push(">");

        if (this._html) {
            markup.push(this._html);
        } else if (this._text) {
            markup.push(escapeHTML(this._text));
        }

        for (var i = 0, len = this.children.length; i < len; ++i) {
            this.children[i].toMarkup(events, markup);
        }

        markup.push("</", this.tagName, ">");

        return markup;
    };

    /**
     * Returns the HTML of this Maker. All arguments are for internal use only.
     */
    Maker.prototype.toHTML = function (events) {
        return this.toMarkup(events).join("");
    };

    /**
     * Returns a jQuery object that represents this Maker, with all events
     * already bound.
     */
    Maker.prototype.toObj = function () {
        var events = {};
        var $obj = $(makeDom(this.toHTML(events)));

        // Bind all events.
        var $tmp, args;
        for (var id in events) {
            $tmp = $obj.find("#" + id);
            args = events[id];

            for (var i = 0, len = args.length; i < len; ++i) {
                $tmp.bind.apply($tmp, args[i]);
            }
        }

        return $obj;
    };

    for (var i = 0, len = attrNames.length; i < len; ++i) {
        (function (attrName) {
            Maker.prototype[attrName] = function (value) {
                return this.attr(attrName, value);
            }
        })(attrNames[i]);
    };

    for (var i = 0, len = eventNames.length; i < len; ++i) {
        (function (eventName) {
            Maker.prototype[eventName] = function (data, handler) {
                return this.bind(eventName, data, handler);
            }
        })(eventNames[i]);
    };

    for (var i = 0, len = tagNames.length; i < len; ++i) {
        (function (tagName) {
            Maker.prototype[tagName] = function (attributes, callback) {
                return this.make(tagName, attributes, callback);
            }
        })(tagNames[i]);
    };

    // Expose.
    $.Maker = Maker;

    /**
     * Creates a Maker with the given arguments, converts it to a jQuery object,
     * and returns it.
     */
    $.make = function (tagName, attributes, callback) {
        return makeMaker(tagName, attributes, callback).toObj();
    };

    /**
     * Creates a Maker with the given arguments and appends it to this jQuery
     * object. Returns the newly created child jQuery object.
     */
    $.fn.make = function (tagName, attributes, callback) {
        var $obj = $.make(tagName, attributes, callback);
        this.append($obj);
        return $obj;
    };

})(jQuery);
