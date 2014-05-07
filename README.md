needjs
======

Needjs is an in-browser resource loader (for Javascript, CSS, etc.)
with integrity checks, failover to additional sources, callback or
synchronous operation, and transparent patching. The idea is to allow
your website to utilize untrusted sources, such as public CDNs or
servers not under your sole and complete control, without risking
either getting undesired (and potentially malicious) content or
inheriting their potential irreliability (in either being up at all or
in serving unaltered content).

<b>Warning 1</b>: Mostly untested and under heavy development. Expect
bugs.

<b>Warning 2</b>: If you want to use this loader to improve security
against external sources injecting malicious code into your site,
consider that you will need to perform integrity-checking, e.g. by
using needjs with a non-empty hash parameter, for _all_ untrusted
content. That includes what you may mistakenly assume to be harmless
non-code, non-content but what user browsers' may interpret
differently. Finally, using needjs for this task requires that you
load needjs itself from a safe source, e.g. by inlining it into your
html document or by loading it from your own server(s).

Statistics
----------

Minified and gzipped size is `1160` bytes (auto-updated on Wed May  7 10:26:29 UTC 2014), after removal of development support such as console.log output. If that is too much for you, there is a bootstrap version that minifies and gzips down to `793` bytes whilst compromising only on speed, not on functionality (invocations with the optional callback parameter are deferred and should work as soon as the full version has been loaded).
However, there is a caveat in using the bootstrap version: None of the advanced functionality (using `''` or `0` as special flags in the URL list, omitting the hash value, etc.) are supported. To make use of them, you must remember to include a callback parameter, e.g. `{}`, to ensure that the bootstrap version defers the call for later, and you must also initiate loading of the full version for these calls to ever get executed.

The minified scripts are not included to discourage production use:
This script is largely untested and I wish to encourage you to obtain
the maximum debug information. Please contribute bug fixes.

Example Usage
-----

Simple example to be used with the development version only:
```javascript
// Load a javascript file, with no integrity check
// NOTE: If you use the development version (the non-minified need.js
//       in the github repository), the correct hash will be logged via
//       console.log(..). You can then easily add integrity checking by
//       appending the hash as an additional parameter to need(..).
//       To activate integrity-checking with the development version,
//       a hash must be supplied.
//
//       With the minified (production) version, omitting the hash
//       parameter is insufficient to turn off integrity-checking.
//       You need to append '' as extra url behind every url you do
//       not want to be integrity-checked (which here, against an
//       undefined hash, would fail).
need([
        "//cdnjs.cloudflare.com/ajax/libs/json3/3.3.1/json3.min.js",
        "//cdn.jsdelivr.net/json3/3.3.1/json3.min.js"
]);
```

Same simple example, adjusted to work with the minified (production) version of needjs:
```javascript
// Load a javascript file, with no integrity check
// The "" markers behind every url are required to turn off the integrity check
need([
        "//cdnjs.cloudflare.com/ajax/libs/json3/3.3.1/json3.min.js", "",
        "//cdn.jsdelivr.net/json3/3.3.1/json3.min.js", ""
]);
```

Slightly advanced example:
```javascript
// Load JSON polyfill asynchronously, if the browser requires it.
// Try public CDNs first, but insist on getting the exact content you expect,
// falling back to your own CDN and then your own server's copy if necessary.
// Only for your own server's copy, disable the integrity check ('' marker).
// If even that fails, suppress the exception otherwise thrown (0 marker).
// Finally, make a callback when the polyfill is ready, but only if it was 
// indeed loaded, not if the polyfill wasn't needed in the first place
window.JSON || need(
    function() { alert('Try again: Your very old browser just learnt JSON.') },
    [
        "//cdnjs.cloudflare.com/ajax/libs/json3/3.3.1/json3.min.js",
        "//cdn.jsdelivr.net/json3/3.3.1/json3.min.js",
        "//your.cdn.com/json3.min.js",
        "/local/fallback/json3.min.js", '',
        0
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

Example of integrity-checking CSS loading in a HTML document. Implement fout-like control to prevent rendering unstyled content: After successful loading, remove a style that prevents the document to be displayed prior to that event.
```html
<!DOCTYPE html>
<html>
  <head>
    <style id="fout">
      html{display:none!important;}
    </style>
    <script src="/js/need.js"></script>
    <script>
      need(
        {el:'style', type:'text/css', cb:function(){
          // style sheet is loaded: display!
          var fout = document.getElementById('fout');
          fout.parentNode.removeChild(fout);
        }},
        ['//myCDN.com/css/style.css', '/css/style.css'],
        '297d814689043f9716f98901d06ac30de557664f5361c3b06fb7984fbb605e60'
      );
    </script>
  </head>
  <body>
    <h1>
      Hello
    </h1>
    If you can see this, your browser has meanwhile fetched the CSS stylesheet,
    verified its integrity,  and executed a javascript callback to remove a
    <code>display: none!important;</code>
    style.
  </body>
</html>
```

Example of using the bootstrap version, to minimize the amount of
bytes that need to be served from your trusted server hosting the html
document itself and bootstrap.min.js. This example loads a custom
javascript file `my.js`, which can be hosted externally due to
integrity-verified loading. Calls to needjs to load other resources,
including a CSS stylesheet and the full version of needjs to support
loading the stylesheet, have been moved to `my.js`.
```html
<!DOCTYPE html>
<html>
  <head>
    <style id="fout">
      html{display:none!important;}
    </style>
    <script src="/js/bootstap.min.js"></script>
    <script>
      need(
        ['//myCDN-1.com/js/my.js', '//myCDN-2.com/js/my.js'],
        'TO DO: Replace with sha256 hash of my.js before testing.'
      );
    </script>
  </head>
  <body>
    <h1>
      Hello
    </h1>
    If you can see this, your browser has meanwhile fetched the CSS stylesheet,
    verified its integrity, and executed a javascript callback to remove a
    <code>display: none!important;</code>
    style.
  </body>
</html>
```

```javascript
// my.js,
// to be hosted at myCDN-1.com/js/my.js and myCDN-2.com/js/my.js

// start loading the full version of needjs
// this can be done by the bootstrap version that only supports
// calls with the URL array and the hash parameters.
need(
    [
        '//myCDN-1.com/js/need.min.js',
        '//myCDN-2.com/js/need.min.js'
    ],
    'ce119b39a138d787392db2112271b85abbae207424a26248d5a260505e5a5282'// SHA256 of need.min.js
);

// load stylesheet
// (this will be deferred until the full needjs version has been 
//  loaded because the bootstrap version does not support the
//  optional first parameter used here)
need(
    {
        el:'style', 
        type:'text/css', 
        cb:function(){
            // style sheet is loaded: display!
            var fout = document.getElementById('fout');
            fout.parentNode.removeChild(fout);
        }
    },
    ['//myCDN-1.com/css/style.css', '//myCDN-2.com/css/style.css'],
    '297d814689043f9716f98901d06ac30de557664f5361c3b06fb7984fbb605e60'
);

// insert custom javascript here
```

Alternatives
------------

There are lots of loaders for javascript (and even more general
resources).  Yet currently, I am only aware of a single full
alternative for loading resources with integrity checks and fallback
to alternative sources,
[VerifyJS](https://github.com/ryancdotorg/VerifyJS). Unlike needjs,
VerifyJS even comes with a license expressly forbidding you from
committing the worst security blunder in using an integrity verifier
for external sources, namely loading the integrity-verification
library itself from an external (and hence potentially untrusted)
source.
