needjs
======

Needjs is an in-browser resource loader (for Javascript, CSS, etc.)
with integrity checks, failover to additional sources, callback or
synchronous operation, and transparent patching. The idea is allow
your website to utilize untrusted sources, such as public CDNs or
servers not under your sole and complete control, without risking
either getting undesired (and potentially malicious) content or
inheriting their potential irreliability (in either being up at all or
in serving unaltered content).

<b>Warning 1</b>: Mostly untested and under heavy development. Expect
bugs.

<b>Warning 2</b>: If you want to use this loader to improve security
against external sources injecting malicious code into your site,
consider that you will need to integrity-check, e.g. by using needjs,
for _all_ untrusted content (including what you may mistake as
harmless), and you need to load needjs itself from a safe
source, e.g. by inlining it into your html document or loading it from
your site.

Statistics
----------

Minified and gzipped size is `1159` bytes (auto-updated on Thu May  1 14:23:56 UTC 2014), after removal of development support such as console.log output. If that is too much for you, there is a bootstrap version that minifies and gzips down to `777` bytes whilst compromising only on speed, not on functionality (invocations using unsupported functionality are deferred and should work as soon as the full version has been loaded).

The minified scripts are not included to discourage production use:
This script is largely untested and I wish to encourage you to obtain
the maximum debug information. Please contribute bug fixes.

Example Usage
-----

Simple example:
```javascript
// Load a javascript file, with no integrity check
// NOTE: If you use the development (the non-minified need.js 
//       in the github repository), the hash to be used to
//       upgrade to integrity checking is logged via console.log(..).
need([
        "//cdnjs.cloudflare.com/ajax/libs/json3/3.3.1/json3.min.js",
        "//cdn.jsdelivr.net/json3/3.3.1/json3.min.js"
]);
```

Slightly advanced example:
```javascript
// Load JSON polyfill asynchronously, if the browser requires it.
// Try public CDNs first, but insist on getting the exact content you expect,
// falling back to your own server's copy if necessary.
// Make a callback when the polyfill is ready, only if it was indeed loaded.
window.JSON || need(
    function() { alert('Try again: Your very old browser just learnt JSON.') },
    [
        "//cdnjs.cloudflare.com/ajax/libs/json3/3.3.1/json3.min.js",
        "//cdn.jsdelivr.net/json3/3.3.1/json3.min.js",
	"/local/fallback/json3.min.js"
    ],
    "ad45931efa6cdd31ebae327b2313915473ddfb24ef144ef491c939aa4c24d832"
);
```

Advanced example:
```javascript
// Load the old version (0.1.3) of bitcoinjs-lib, 
// patching it to not use console.log,
// and make a callback.
need({
     cb: function() { 
       alert('Bitcoinjs-lib is ready to use.'); 
     },
     filter: function(code ) {
       // replace the string "console" with "noconsole",
       // which (for bitcoinjs-0.1.3.min.js) sufficies to have its
       // window.console detection fail
       return code.replace(/console/g, 'noconsole');
     }
   },
   [
       "//cdnjs.cloudflare.com/ajax/libs/bitcoinjs-lib/0.1.3/bitcoinjs-min.js",
       "//cdn.jsdelivr.net/bitcoinjs/0.1.3/bitcoinjs-min.js"
   ],
   '7084c8ba54ac633a4b58bc62f7a18c89f55dc2685ea137cade1ed358af63168b'
);
```

Example of integrity-checked CSS loading:
```html
<!DOCTYPE html>
<html>
  <head>
  <!-- Load CSS stylesheet, with integrity check, and apply a custom fout control --!>
  <!-- (since neddjs' asynchronous loading may make browsers try drawing the page before the stylesheet is available). --!>
  <style id="fout">
    html{display:none!important;}
  </style>
  <script src="need.js"></script>
  <script>
    need({el:'style', type:'text/css', cb:function(){
        // style sheet is loaded: display!
        var fout = document.getElementById('fout');
        fout.parentNode.removeChild(fout);
      }}, ['//myCDN.org/style.css', '/style.css'],
      '297d814689043f9716f98901d06ac30de557664f5361c3b06fb7984fbb605e60');
  </script>
  </head>
  <body>
    <h1>Hello</h1>
    If you can see this,
    your browser has meanwhile fetched the CSS stylesheet,
    verified its integrity, 
    and executed a javascript callback to remove a
    <code>display: none!important;</code>
    style.
  </body>
</html>
```

Alternatives
------------

There are lots of loaders for javascript (and even more general resources).
Yet currently, I am only aware of a single full alternative
for loading resources with integrity checks and fallback to
alternative sources,
[VerifyJS](https://github.com/ryancdotorg/VerifyJS). Unlike needjs,
VerifyJS even comes with a license designed to prevent you from being
allowed to commit the worst security blunder in using an integrity
verifier for external sources, namely loading the
integrity-verification library itself from an external (and hence
potentially untrusted) source.
