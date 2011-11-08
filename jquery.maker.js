(function ($, undefined) {
    // All known HTML tag names, per http://dev.w3.org/html5/spec/Overview.html.
    var tagNames = "a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup command data datalist dd del details dfn div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd keygen label legend li link map mark menu meta meter nav noscript object ol optgroup option output p param pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td textarea tfoot th thead title tr track u ul var video wbr".split(" ");
    // All known HTML attribute names, per http://dev.w3.org/html5/spec/Overview.html.
    var attrNames = "accept accept-charset accesskey action alt async autocomplete autofocus autoplay border challenge charset checked cite class cols colspan content contenteditable contextmenu controls coords crossorigin data datetime default defer dir dirname disabled draggable dropzone enctype for form formaction formenctype formmethod formnovalidate formtarget headers height hidden high href hreflang http-equiv icon id ismap keytype kind label lang list loop low manifest max maxlength media mediagroup method min multiple muted name novalidate open optimum pattern placeholder poster preload radiogroup readonly rel required reversed rows rowspan sandbox scope scoped seamless selected shape size sizes span spellcheck src srcdoc srclang start step style tabindex target title type typemustmatch usemap value width wrap".split(" ");
    // All known jQuery event names, per jQuery 1.7.
    var eventNames = "blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" ");

    var escapeMap = {
       "<": "&lt;",
       ">": "&gt;",
       "&": "&amp;",
       '"': "&#34;",
       "'": "&#39;"
    };

    function escapeHTML(text) {
        return String(text).replace(/[<>'"&]/g, function (c) {
            return escapeMap[c];
        });
    }

    function Maker(tagName, attrs) {
        this.tagName = tagName || "div";
        this.attributes = attrs || {};
        this.children = [];
        this.events = [];
    }

    /**
     * Creates a new Maker and appends it as a child of this Maker. Accepts
     * a variable-length argument list, processed according to the following
     * rules:
     *
     *   1. All arguments are processed in the same order they are given
     *   2. If the first argument is a string and it is a valid HTML tag name,
     *      it is used as the tag name. If it's not a valid tag name it is used
     *      as the text
     *   3. If any remaining argument is a function, it will be called with the
     *      new Maker as its only argument
     *   4. If any remaining argument is a string, it is used as the text
     *   5. All properties of any other remaining argument(s) will be used as
     *      the attributes
     */
    Maker.prototype.make = function () {
        var args = $.makeArray(arguments);

        var maker;
        if (typeof args[0] == "string" && tagNames.indexOf(args[0]) != -1) {
            maker = new Maker(args.shift());
        } else {
            maker = new Maker;
        }

        var arg;
        for (var i = 0, len = args.length; i < len; ++i) {
            arg = args[i];

            if (typeof arg == "function") {
                arg(maker);
            } else if (typeof arg == "string") {
                maker.setAttribute("text", arg);
            } else {
                for (var name in arg) {
                    maker.setAttribute(name, arg[name]);
                }
            }
        }

        if (this instanceof Maker) {
            this.children.push(maker);
        }

        return maker;
    }

    /**
     * Sets the attribute with the given `name`.
     */
    Maker.prototype.setAttribute = function (name, value) {
        this.attributes[name] = value;
        return this;
    }

    /**
     * Sugar for setAttribute("class", value).
     */
    Maker.prototype.className = function (value) {
        return this.setAttribute("class", value);
    }

    /**
     * Sugar for setAttribute("text", value).
     */
    Maker.prototype.text = function (value) {
        return this.setAttribute("text", value);
    }

    /**
     * Binds the event with the given `name`.
     */
    Maker.prototype.bind = function (name, data, handler) {
        this.events.push([name, data, handler]);
        return this;
    }

    /**
     * Sugar for bind.
     */
    Maker.prototype.on = Maker.prototype.bind;

    /**
     * Returns an HTML string that represents this Maker (without events). If
     * `shallow` is `true` the HTML will not include children.
     */
    Maker.prototype.toHTML = function (shallow) {
        var html = "<" + this.tagName;

        for (var name in this.attributes) {
            if (name != "text") {
                html += " " + name + '="' + escapeHTML(this.attributes[name]) + '"';
            }
        }

        html += ">";

        if (this.attributes.text) {
            html += escapeHTML(this.attributes.text);
        }

        if (!shallow) {
            for (var i = 0, len = this.children.length; i < len; ++i) {
                html += this.children[i].toHTML();
            }
        }

        html += "</" + this.tagName + ">";

        return html;
    }

    /**
     * Returns a jQuery object that represents this maker. If `shallow` is
     * `true` the object will not include children.
     */
    Maker.prototype.toObj = function (shallow) {
        var $obj = $(this.toHTML(true));

        for (var i = 0, len = this.events.length; i < len; ++i) {
            $obj.bind.apply($obj, this.events[i]);
        }

        if (!shallow) {
            for (var i = 0, len = this.children.length; i < len; ++i) {
                $obj.append(this.children[i].toObj());
            }
        }

        return $obj;
    }

    for (var i = 0, len = attrNames.length; i < len; ++i) {
        (function (attrName) {
            Maker.prototype[attrName] = function (value) {
                return this.setAttribute(attrName, value);
            }
        })(attrNames[i]);
    }

    for (var i = 0, len = eventNames.length; i < len; ++i) {
        (function (eventName) {
            Maker.prototype[eventName] = function (data, handler) {
                return this.bind(eventName, data, handler);
            }
        })(eventNames[i]);
    }

    for (var i = 0, len = tagNames.length; i < len; ++i) {
        (function (tagName) {
            Maker.prototype[tagName] = function () {
                var args = $.makeArray(arguments);
                args.unshift(tagName);
                return this.make.apply(this, args);
            }
        })(tagNames[i]);
    }

    // Expose.
    $.Maker = Maker;

    $.fn.make = function () {
        var args = $.makeArray(arguments);
        var maker = Maker.prototype.make.apply(null, args);
        return this.append(maker.toObj());
    }
})(jQuery);
