// maker
$div.make("div", function (div) {
    div.mouseover(function () {
        $(this).toggleClass("yellow");
    });
    div.p("my-paragraph", function (p) {
        p.span({"class": "good-advice", text: "If you haven't already, you should sign up for "});
        p.a({href: "http://www.twitter.com"}, function (a) {
            a.strong({text: "Twitter"});
        }).click(function () {
            return confirm("Are you sure you want to do this?");
        });
    });
});

// builder
$div.build(function (html) {
    var div = html.div().mouseover(function () {
        $(this).toggleClass("yellow");
    });
    var p = div.p("my-paragraph");
    p.span("good-advice").text("If you haven't already, you should sign up for ");
    var a = p.a().href("http://www.twitter.com").click(function () {
        return confirm("Are you sure you want to do this?");
    });
    a.strong().text("Twitter");
});
