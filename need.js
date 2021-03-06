/**
 * @overview Load javascript dependencies with integrity check and fallback to multiple source URLs. Code repository at [https://github.com/pyramids/needjs].
 *
 * @author Björn Stein
 *
 * @license MIT
 *
 * Goals:
 *  1. Check integrity of files loaded (with a cryptographic hash),
 *     to enable the use of untrusted public or third-party repositories
 *  2. Conditionally load polyfills based on object presence
 *  3. Permit synchronous or asynchronous operation
 *  4. No own dependencies

  USAGE:

  If your code needs window.library provided by untrusted
  //cdn1/lib.js and //cdn2/path/lib.js or, as a less desireable
  fallbacks, at /js/lib.js, use the following code where "xHASHxx" is
  the SHA256 hash of the correct lib.js:

  window.library || window.need({"//cdn1/lib.js", "//cdn2/path/lib.js", "/js/lib.js"}, "xHASHxx");

  The first argument (non-present in this example) can optionally hold
  a callback function to be called after the code has been loaded and
  executed by injection into the DOM as a script element.  Code will
  not be evaluated unless it has the correct SHA256 hash.

  IMPORTANT --- !!! BIG, BIG WARNING !!! ---

  You can disable a core functionality, integrity checking, by
  inserting an empty string ('') as next URL behind the one you whish
  to trust even if its content does not match the hash you gave. This
  can be useful if you have one or more fallback sources that you
  trust more than you trust yourself (or clients running this code) to
  get all SHA-256 hashes right.

  NOTE (error handling):

  If you do not want an exception to be thrown if no acceptable
  content could be loaded from any of the URLs you supplied, you need
  to append the intgeer 0 as final entry in the list of fallback
  URLs. Alternatively, you may want to catch this event via a
  window.onerror handler.

  NOTE (CORS):

  You also have to tell the browser to not enforce the SAME-ORIGIN
  policy with cdn1 and cdn2 because this library uses a XMLHttpRequest
  to load the scripts.

  CALLBACK FUNCTIONALITY:

  You have many options to introduce callback functions. If the object
  passed as callback is...

    0. The integer 0, then all callback-related functionality is
       disabled in favor of an attempt at synchronous loading. Note
       that browser support to do so from the main thread appears to
       be disappearing, so avoid using this outside of a Web Worker
       context.

    1. A function, then it is called after the script has executed.

    2. A string, then it is injected right after the script, to
       execute in a global context.

    3. An object, then multiple callback and preprocessing functions
       are supported:

         callback.cb: a string or a function taking the place of the
                      string or function that could otherwise be
                      passed as callback

	 callback.filter: a function(content, contentHash,
	                  desiredHash) returning a string, can be used
	                  to manipulate the loaded content before
	                  execution. It will only be called if the
	                  source is acceptable (either the contentHash
	                  === desiredHash, or the source URL was
	                  flagged to be trusted regardless of hash by
	                  being directly followed by '' as next URL).
			  
			  To abort loading, return '' (which will be
			  executed as script, with almost no effects).

			  To fallback to other sources, do not return
			  anything (current behavior is to fallback if
			  no string type is returned, but this
			  behavior is subject to change. Hence only
			  "return;" is recommended to cause this
			  fallback).

			  Avoid throwing uncatched exceptions, as
			  these will currently bubble up to
			  window.onerror and abort all loading, and as
			  it is possible that this behavior will be
			  changed in the future, if a need to catch
			  exceptions in need.js should be recognized.

			  NOTE: For defining future functionality,
			  avoid using the integer value 0 for
			  anything. Consistent behavior with the use
			  of 0 as URL would be to fail silently, but
			  this is already achieved by returning '' and
			  differs from current behavior.
			  
         callback.el: a string with the element name to be injected
                      (default: 'script')

         callback.type: a string with the type tag to inject with
         

    4. An array, then it is assumed that the optional callback
       parameter was omitted and the first parameter represents the
       array of source URLs. No callback-related functionality is
       available in this case.


  Open encoding issue:

    Currently, the script is loaded with unspecified encoding (which
    should avoid changing the file's hash through re-encoding), but
    then it utf8-encoded for hash calculation (included in the sha256
    function), and finally injected without this encoding.
    
    This is likely not the desired approach.
    Either not utf8-encoding at all until injection into the DOM,
    or utf8-encoding starting with the request headers might be correct
    (but those are untested guesses for now).


  Open cross-site issue:

    If one of the sources fails to load due to missing or
    insufficiently permissive Access Control headers, the exception
    INVALID_ACCESS_ERR is currently not caught (where exactly should
    it be caught...?). This behavior is contrary to the design goal of
    reaching increasing reliability through replication and should be
    altered.


  Open Namespace Pollution Issue:

    This script creates need(..) and needSHA256(..), the latter of
    which could easily be hidden in a closure. It is not because its
    presence may be convenient as a fallback eventually (currently,
    until the utf8 encoding issue is resolved, consider the needSHA256
    functionality subject to change as in the future it may or may not
    utf8-encode its argument before calculating the hash).

    Just for completeness' sake: There is also, as a fallback for old
    browsers, the possibility that window.needcbXXX objects, where XXX
    is a hex-encoded SHA256 hash, are created. This should not be an
    issue unless you like to have cryptical 36 letter names matching
    sub-resource's SHA256 hash in your code's namespace.


  NOTE: Synchronous requests may be impossible from the "main thread."
        https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest:
	Note: Starting with Gecko 30.0 (Firefox 30.0 / Thunderbird
	30.0 / SeaMonkey 2.27), synchronous requests on the main
	thread have been deprecated due to the negative effects to the
	user experience.

*/

/*global window */

/**
 * window.needSHA256(binInput[, callback]) calculates the SHA256 hash
 * of the DOMString (binInput), which must represent raw (unecoded)
 * input by representing each consecutive byte of data as the charcode
 * of of one character, ranging from 0 to 0xFF. A DOMString is the
 * default type used by XMLHttpRequest for its responseText.
 *
 * It can be implemented in
 * either of two ways:
 * 
 * a) It can return a (ASCII or UTF8) string representation of the
 * hexadecimal SHA256 hash of binInput
 *
 * or, at the implementor's choice,
 *
 * b) It can return a "falsy" value (one that evaluates as false,
 * e.g. undefined, easily achieved by not explicitly returning
 * anything). In this case, it *MUST* eventually call callback(hash)
 * where hash is the string that would be returned in variant a).
 *
 * If the caller wishes for a uniform interface, the suggested way to
 * achieve it is:
 *
 *   var hash = needSHA256(binInput, callback);
 *   if (hash) setTimeout(callback(hash),0);
 *
 * The function is exposed to the global namespace (in browsers) to
 * enable users to 
 *
 *   a) replace it with a better implementation on the fly, especially
 *      if another one happens to become available anyways as other
 *      libraries are loaded, or if extra functionality such as
 *      asynchronous operation is required
 *
 *   b) access it in their own code, especially in projects that are
 *      very size-constrained.
 *
 * At your discretion, you may of course decide that within your own
 * project, you will guarantee that this function always uses the
 * synchronous option for implementation.  Using another namespace for
 * that would be a much safer option, though.
 *
 */

// sha256 function from sha256.js
// at https://github.com/jbt/js-crypto by James Taylor
// license:
/* By attaching this document to the given files (the “work”), you, the licensee, are hereby granted free usage in both personal and commerical environments, without any obligation of attribution or payment (monetary or otherwise). The licensee is free to use, copy, modify, publish, distribute, sublicence, and/or merchandise the work, subject to the licensee inflecting a positive message unto someone. This includes (but is not limited to): smiling, being nice, saying “thank you”, assisting other persons, or any similar actions percolating the given concept.
The above copyright notice serves as a permissions notice also, and may optionally be included in copies or portions of the work.
The work is provided “as is”, without warranty or support, express or implied. The author(s) are not liable for any damages, misuse, or other claim, whether from or as a consequence of usage of the given work.
*/
window.needSHA256 = window.needSHA256 || (function(){
  // Eratosthenes seive to find primes up to 311 for magic constants. This is why SHA256 is better than SHA1
  var i=1,
      j,
      K=[],
      H=[],
      sixteen=16;

  while(++i<18)
    for(j=i*i;j<312;j+=i)
      H[j]=1;

  function x(num,root){
    return(Math.pow(num,1/root)%1)*4294967296|0;
  }

  for(i=1,j=0;i<313;)
    if(!H[++i])
      H[j]=x(i,2), K[j++]=x(i,3);

  function add(x, y){
    return (((x>>1)+(y>>1))<<1)+(x&1)+(y&1) ;
    //var msw = (x >> sixteen) + (y >> sixteen) + ((y=(x & ffff) + (y & ffff)) >> sixteen);
    //return (msw << sixteen) | (y & ffff);
  }

  function S (X, n) { return ( X >>> n ) | (X << (32 - n)); }

  function SHA256(b){
    var HASH = H.slice(i=0),
//
// unescape(..) is DEPRECATED, so the following line could cause
// problems in the future, see
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/unescape
//
// The combination unescape(encodeURI(DOMString) appears to be a hack
// to do a conversion to 16-bit unicode encoding (as used in
// DOMString). It is probably not needed anyways (here we are
// concerned with the file as served to everybody with whatever
// encoding we chose to request it for; proper character encoding will
// only matter later for evaluating it).
//
//        s = unescape(encodeURI(b)), /* encode as utf8 */
        s=b,
        W = [],
        l = s.length,
        m = [],
        a, y, z;
//
// The following line has a problem for charCodes >= 0x80, which
// should be (UTF8-) encoded into two bytes (or sometimes three?
// DOMStrings have charCodes ranging from 0x00 to 0xFFFF).
//
// This is okay only if it is guaranteed that the input string does
// not have any charCodes outside the range 0 to 0xFF inclusive.
//
// Current behavior should yield that (except that 0x80 to 0xFF get
// sign-extended into 0xFF80 to 0xFFFF)
//
      for(;i<l;) m[i>>2] |= (s.charCodeAt(i) & 0xff) << 8*(3 - i++%4);

    l *= 8;

    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[z=((l + 64 >> 9) << 4) + 15] = l;

    for (i=0 ; i<z; i+=sixteen ) {
      a = HASH.slice(j=0,8);

      for (; j<64;a[4] = add(a[4],y)) {
        if (j < sixteen) W[j] = m[j + i];
        else W[j] = add(
          add(S(y=W[j-2],17) ^ S(y,19) ^ (y>>>10),   W[j - 7]),
          add(S(y=W[j-15],7) ^ S(y,18) ^ (y>>>3),   W[j - sixteen])
        );

        a.unshift(
          add(
            y=add(
              add(
                add(a.pop(),  S(b=a[4],6) ^ S(b,11) ^ S(b,25)),
                add((b&a[5]) ^ ((~b)&a[6]),  K[j])
              ),
              W[j++]
            ),
            add(S(l=a[0],2) ^ S(l,13) ^ S(l,22),  (l&a[1]) ^ (a[1]&a[2]) ^ (a[2]&l))
          )
        );
      }

      for(j=8;j--;) HASH[j] = add(a[j],HASH[j]);
    }

    for(s='';j<63;) s += ((HASH[++j>>3]>>4*(7-j%8))&15).toString(sixteen);

    return s;

  }
  return SHA256;
})();




window.need = (function(callback, urls, hash) {
    "use strict";

    if (callback.push) {
	// callback appears to be the array parameter urls
	// so assume that the optional parameter callback is missing
	hash = urls;
	urls = callback;
	callback = '';
    };

    /*dev-only-start*/
	function log(msg) { 
	    // try logging to the console, if the browser lets us
	    try { 
		console.log('need.js:',msg);
	    } catch(e) {};
	};
    /*dev-only-stop*/

    if (urls[0] === '') {
	// skip past an ignore-hash marker belonging to a previous URL
	urls.shift();
    };

    if (urls[0] === 0) {
	// we have reached a marker, the integer 0, given as next URL,
	// indicating that the caller wishes us to fail silently rather
	// than to throw an exception from asynchronously executed code

	/*dev-only-start*/{
	    log('silently failing for resource with hash '+hash);
	}/*dev-only-stop*/

	return;
    };

    if ('number' === typeof urls[0]) {
	// if a non-zero number x is passed as a URL, occasionally (in
	// ca. 1% of invocations), shuffle the next x urls to prime
	// the client cache with one of the fallback sources
	//
	// NOTE: Use with caution; incompatible with URL flags.
	if (Math.random(100) < 1) {
	    var idx = Math.ceil(Math.random(urls.shift())), firstUrl;

	    // move urls[idx] to urls[0], keeping urls[0] as next
	    // fallback (urls[1]), and otherwise only change the order
	    // among indices 0...idx
	    firstUrl = urls[0];
	    urls[0] = urls[idx];
	    urls[idx] = urls[1];
	    urls[1] = firstUrl;
	}
    }

    var 
      xhr=new XMLHttpRequest(),
      binStr; // the raw (not charset-recoded, binary) data loaded

    if (urls[0]) {
	if ('withCredentials' in xhr) {
	    // XMLHttpRequest2 object detected:
	    // this supports CORS, so all is well
	    xhr.open('GET', urls[0], callback!==0);
	} else if (typeof XDomainRequest != "undefined") {
	    // Use semi-equvalent XDomainRequest
	    // (in IE8 and ... possibly nowhere else?)
	    xhr = new XDomainRequest();
	    xhr.open('GET', urls[0]);
	} else {
	    // we are stuck with the old version of a XMLHttpRequest
	    // by polyfilling some of the new event handlers (onload,
	    // onerror), we may at least be able to support non-CORS
	    // source URLs...
	    xhr.open('GET', urls[0], callback!==0);
	    if (callback!==0) {
		// asynchronous case
		xhr.onreadystatechange = function() {
		    // wait until "DONE" status is reached,
		    // rather than asynchronously processing partial responses
		    if (this.readyState == 4) {
			// only accept responses with a HTTP 200 status code
			if (this.status == 200) {
			    // xhr.onload should be called---calling process
			    process();
			} else {
			    // xhr.onerror should be called---calling fallback
			    fallback();
			};
		    };
		};
	    };
	};
	xhr.onload = process;
	// handle both error and timeout events, in case some
	// implementation does not issue an error event in both cases
	xhr.ontimeout = fallback;
	xhr.onerror = fallback;
    } else {
	// in normal use, this will occur if all given urls
	// sequentially failed to provide data matching this hash
	// (but it could also be that the user called us with no urls)
	throw 'need.js: no source for hash ' + hash;
    }

    // only if this is not the last fallback URL: set a timeout 
    // detect existence of further fallback URL(s) by looking for an
    // existing and non-falsy (non-marker) URL
    if (urls[1] || urls[2]) {
	// use global window.needTimeout (for all calls), if the user provided it
	// otherwise, 5s should be enough for a HTTPS connection even if one (single!) packet is lost
	xhr.timeout = window.needTimeout || 5000;
    };

    // TODO: The following hack prevents any character encoding to
    //       affect what exactly we receive, but forcing utf8 instead
    //       may be more appropriate here.

    // Hack to pass bytes through unprocessed, with exactly one
    // received byte contained at each index of the string
    // xhr.responseText. Source:
    // http://www.html5rocks.com/en/tutorials/file/xhr2/
    if (xhr.overrideMimeType) {
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
    }

    xhr.send();

    if (callback===0) {
	// synchronous case
	process();
    };


    function fallback() {
	// try again, with the first item of urls (the url that just
	// failed) removed

	// only do the following once, in case any browser triggers
	// more than one error handler (ontimeout, onerrror, or load
	// with non-200 HTTP status code)
	if (xhr) {	
	    /*dev-only-start*/{
		log('failed to load ' + urls[0] + '; HTTP status ' + xhr.status);
	    }/*dev-only-stop*/

	    xhr = 0;
	    binStr = 0;

	    // try the next url
	    need(callback, urls.slice(1), hash);
	};
    };

    // process response:
    // calculate SHA256 hash (possibly asynchronously), if required,
    // the call finish(hash)
    function process() {
	binStr = xhr.responseText;

	// only bother calculating the hash if there is no ''
	// marker indicating that we should ignore the hash
	var actualHash = '';
	if (urls[1] !== '') {
	    actualHash = needSHA256(binStr, finish);
	    if (!actualHash) {
		// hash is being calculated asynchronously, and
		// finish(hash) will be called when done
		return;
	    }
	}
	// hash was calculated synchronously, so we need to call finish(..)
	finish(actualHash);
    }

    // take DOMString binStr with one character per UTF8 byte, and
    // convert it into an actual UTF16 DOMString
    function decodeUTF8() {
	var i,j,l,c,buf,strbuf;

	i=0;
	l=binStr.length;
	strbuf=[];
	while (i<l) {
	    j = Math.min(l, i + 1024);
	    buf=[];
	    while (i<j) {
		// need to coerce input into byte-range
		// (byte values appear sign-extended)
		c = binStr.charCodeAt(i++) & 0xFF;
		if (c < 0x80) {
		    buf.push(c);
		} else if (c < 0xE0) {
		    // 0xD0 to 0xEF: 2 byte UTF8 representation of
		    // codepoints up to 0x07FF
		    buf.push(((c & 0x1F) << 6) |
			     (binStr.charCodeAt(i++) & 0x3F )
			    );
		} else if (c < 0xF0) {
		    // 0xE0 to 0xEF: 3 byte UTF8 representation of
		    // codepoints up to 0xFFFF
		    c = ((c & 0x0F) << 12) |
			((binStr.charCodeAt(i++) & 0x3F ) << 6) |
			(binStr.charCodeAt(i++) & 0x3F );
		    buf.push(c);
		} else if (c < 0xF8) {
		    // 0xF0 to 0xF7: 4 byte UTF8
		    // representation of codepoints up to
		    // 0x1F,FFFF, requiring surrogate
		    // codepoints in UTF16; assign c to codepoint minux 0x1,0000
		    c = ((c & 0x07) << 18) |
			((binStr.charCodeAt(i++) & 0x3F ) << 12) |
			((binStr.charCodeAt(i++) & 0x3F ) << 6) |
			(binStr.charCodeAt(i++) & 0x3F )
			- 0x10000;
		    // lead (high) surrogate
		    buf.push(0xD800 + (c >>> 10));
		    // trail (low) surrogate
		    buf.push(0xDC00 + (c & 0x3FF));
		} else {
		    // 5 to 6 byte UTF8 representations of codepoints
		    // that mostly do not(?!?) have UTF16 equivalents
		    
		    //throw new Error('unimplemented UTF8 codepoints used');
		    
		    // skip this character
		    do {
			c = binStr.charCodeAt(i++);
		    } while ((c & 0xC0) == 0x80);
		};
	    };
	    strbuf.push(String.fromCharCode.apply(null, buf));
	};
	binStr = strbuf.join('');
    };
    
    // check and evaluate javascript data in binStr (if and only if it has the correct SHA256 hash)
    function finish(actualHash) {
	// any non-ASCII characters? if so, treat them as UTF8
	if (/[^\x00-\x7F]/.test(binStr)) {
	    decodeUTF8();
	};

	// locate DOM parent element for injecting the content;
	// if not present (yet?), reschedule this task
	//
	// whilst it would be more efficient to do some verification
	// (and fallback to the next source, if necessary) before
	// waiting for the DOM, browsers typically have the required
	// head object ready immediately, so there is little gain in
	// optimizing this
	//
	// TODO: This fails if the html document does not have a head
	//       tag.  Decide how to deal with this (document the
	//       requirement for a head? or create a head tag?).

	// IE<=8 does not support document.head
	//var parent = document.head || document.getElementsByTagName('head')[0];
	var parent = document.getElementsByTagName('head')[0];
	/**/if (!parent) {
	    setTimeout(function(){
		finish(actualHash);
	    }, 50);
	    return;
	};/**/


	// TODO: Are there common sh256 libraries/APIs we should test
	//       for and use for possibly improved performance?  
	//
	//       Polycrypt, crypto-js, ...: ?
	//       Web Crypto API: Maybe we should...

	// Missing hash?
	// In the development version only:
	// Continue, logging the required hash log(..) to console.log

	/*dev-only-start*/{
	    if ('undefined' === typeof hash) {
		// no hash given:
		// go ahead in development version only; 
		// advise on how to proceed
		actualHash = actualHash || needSHA256(binStr);
		hash = actualHash;
		log('called without hash for \''+urls[0]+'\'; use \''+actualHash+'\')');
	    }
	}/*dev-only-stop*/

	if ((hash != actualHash) && (urls[1] !== '')) {
	    // incorrect hash,
	    // and not excempted by a '' marker as next url

	    /*dev-only-start*/{
		log('' + urls[0] + ' has incorrect hash ' + actualHash
		   + ' and instead of an empty string as ignore-hash flag, the next url is \"'+urls[1]+'\"');
	    }/*dev-only-stop*/
	    
	    // TODO: Here some logging (to web server?) could be added
	    //       even for production use.  However, in many cases
	    //       the server logs will already show what is
	    //       happening due to the coming fallback request(s).
	    
	    fallback();
	    
	    // important: abort (lest we inject the bad content)
	    return;
	};
	
	// TODO: Can we handle encodings other than utf8?  To
	//       reliably form the hash, we had to override it but
	//       now we need to interpret special charcters as
	//       text.

	// Javascript injection, found at
	// http://stackoverflow.com/questions/6432984/adding-script-element-to-the-dom-and-have-the-javascript-run
	var el = callback.el || 'script';
	var s = document.createElement(el);
	if (callback.type) {
	    s.type = callback.type;
	};

	// only in development version: catch and log errors during injection
	/*dev-only*/ try {
	    if ('object' === typeof callback) {
		if (callback.filter) {
		    binStr = callback.filter(binStr, actualHash, hash);
		    
		    // do not use this result if it is not a string
		    if ('string' !== typeof(binStr)) {
			/*dev-only-start*/{
			    log(
				'callback.filter rejected content from '
				    + urls[0]
			    );
			}/*dev-only-stop*/

			// do not fallback to other sources
			// (since the filter _should_ reject them again anyways)
			//fallback();
			
			// and abort lest we inject the returned
			// flag into the DOM
			return;
		    };
		};

		// proceed as if callback.cb had been passed as callback
		callback = callback.cb || '';
	    };
	    if (('string' === typeof callback) && (callback !== '')) {
		if (el === 'script') {
		    // inject a string given as callback directly
		    // into the loaded resource, to be executed
		    // outside any scoping if and when the loaded
		    // resource has executed without error
		    binStr = binStr + ';' + callback;
		} else {
		    // loaded resource is not a script, so the best we
		    // can do to honor it is to eval(..) it, with
		    // scope changed to the global scope
		    callback = function() {
			// setTimeout(callback,0) has the desired
			// effect of evaluating (callback) in the
			// global scope, and it compresses neatly
			// (since it is used elsewhere), with the only
			// disadvantage being that a small extra delay
			// is applied (typ. the maximum of 4ms and the
			// time the browsers' event queue empties)
			//setTimeout(callback,0);
			// eval only works in a global scope if we
			// override the this object with the global
			// object (window in browsers)
			eval.call(window, callback);
		    };
		};
	    };

	    s.appendChild(document.createTextNode(binStr));
	    // TODO: Should we allow a choice between body and head?
	    //       For scripts, body is probably the better choice
	    //       For style sheets, standards call for head

	    //parent.appendChild(s);
	    parent.insertBefore(s, parent.childNodes[0]);
	    if ('function' === typeof callback) {
		setTimeout(callback, 0);
	    };

/*dev-only-start*/
	} catch (e) {
	    log('Error appending script from' + urls[0]+': '+e);
	};
/*dev-only-stop*/
    };
});
