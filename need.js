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
                        (default: 'text/javascript', even if
                        callback.el is given and not 'script')
         

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

    This script creates need(..) and needSha256(..), the latter of
    which could easily be hidden in a closure. It is not because its
    presence may be convenient as a fallback eventually (currently,
    until the utf8 encoding issue is resolved, consider the needSha256
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


// sha256 function from sha256.js
// at https://github.com/jbt/js-crypto by James Taylor
// license:
/* By attaching this document to the given files (the “work”), you, the licensee, are hereby granted free usage in both personal and commerical environments, without any obligation of attribution or payment (monetary or otherwise). The licensee is free to use, copy, modify, publish, distribute, sublicence, and/or merchandise the work, subject to the licensee inflecting a positive message unto someone. This includes (but is not limited to): smiling, being nice, saying “thank you”, assisting other persons, or any similar actions percolating the given concept.
The above copyright notice serves as a permissions notice also, and may optionally be included in copies or portions of the work.
The work is provided “as is”, without warranty or support, express or implied. The author(s) are not liable for any damages, misuse, or other claim, whether from or as a consequence of usage of the given work.
*/
needSha256 = (function(){
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
//        s = unescape(encodeURI(b)), /* encode as utf8 */
      s=b,
        W = [],
        l = s.length,
        m = [],
        a, y, z;
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




/*window.*/need = (function(callback, urls, hash) {
    "use strict";

//    if (('object' === typeof callback) && (callback.push)) {
    if (callback.push) {
	// optional parameter callback (which could be a string,
	// function, or 0) is not present, since our first parameters
	// appears to be an array (which urls has to be and callback
	// must not be)
	hash = urls;
	urls = callback;
	callback = '';
    };

    // try to log to console, if the browser lets us
    /*dev-only*/ var log = function(msg) { try { console.log('need.js:',msg) } catch(e) {} };


    if (urls[0] === 0) {
	// we have reached a marker, the integer 0, given as next URL,
	// indicating that the caller wishes us to fail silently rather
	// than to throw an exception from asynchronously executed code

	/*dev-only*/ log('silently failing for resource with hash '+hash);
	return;
    }

    var xhr=new XMLHttpRequest();
    xhr.open('GET',urls[0],callback!==0);

    var fallback = function() {
	// try again, with the first item of urls (the url that just failed) removed

	// only do the following once,
	// if any browser triggers more than one error handler (ontimeout, onerrror, or load with non-200 HTTP status code)
	fallback = function() {};
	
	/*dev-only*/	log('failed to load ' + urls[0]);

	if (urls.length == 1) {
	    // we are unable to load the dependency: throw an exception
	    // (which can be "caught" in the window.onerror handler)
	    //
	    // NOTE: You can prevent this behavior by appending the
	    //       urls array with the integer 0.
	    throw 'need.js: no fallback after ' + urls[0] + ' for hash ' + hash;
	} else {
	    window.need(callback, urls.slice(1), hash);
	};
    };
    
    // check and evaluate javascript data in binStr (if and only if it has the correct SHA256 hash)
    var process = function(binStr) {
	// TODO: Are there common sh256 libraries/APIs we should test
	//       for and use for possibly improved performance?  
	//
	//       Polycrypt, crypto-js, ...: likely not significantly faster
	//       Web Crypto API: Maybe we should...
	var actualHash = needSha256(binStr);


	// Missing hash?
	// In the development version only:
	// Continue, logging the required hash via console.log

	/*dev-only*/ if ('undefined' === typeof hash) {
	    /*dev-only*/ hash = actualHash;
	    /*dev-only*/ log('called without hash; change to:   need('+((callback!==urls)?callback+', ':'')+JSON.stringify(urls)+', \''+actualHash+'\')');
	/*dev-only*/ }

	if (hash != actualHash) {
	    if (urls[1] === '') {
		// we have an incorrect hash, but it is followed by an
		// empty URL marker, indicating that we should trust
		// this source despite the mismatch
	    } else {
		/*dev-only*/ log('' + urls[0] + ' has incorrect hash ' + actualHash);

		// TODO: Here some logging (to web server?) could be added
		//       even for production use.  However, in many cases
		//       the server logs will already show what is
		//       happening due to the coming fallback request(s).
		
		fallback();

		// important: abort (lest we inject the bad content)
		return;
	    };
	}

//	if (hash == actualHash) {
	    // TODO: Can we handle encodings other than utf8?  To
	    //       reliably form the hash, we had to override it but
	    //       now we need to interpret special charcters as
	    //       text.


	    // Javascript injection, found at
	    // http://stackoverflow.com/questions/6432984/adding-script-element-to-the-dom-and-have-the-javascript-run
	    var s = document.createElement(callback.el || 'script');
	    s.type = callback.type || 'text/javascript';
	    try {
		if ('object' === typeof callback) {
		    if (callback.filter) {
			binStr = callback.filter(binStr, actualHash, hash);
			
			// do not use this result if it is not a string
			if ('string' !== typeof(binStr)) {
			    /*dev-only*/ log('callback.filter rejected content from '+urls[0]);
			    // fallback to other sources
			    fallback();
			}
		    };

		    // proceed as if callback.cb had been passed as callback
		    callback = callback.cb || '';
		};
		if ('string' === typeof callback) {
		    binStr = binStr + '\n;' + callback;
		};
		if ('function' === typeof callback) {
		    // Microsoft's recommended pattern to work around the
		    // lack of an onload event in IE <= 8, found at
		    // http://msdn.microsoft.com/en-us/library/ie/hh180173(v=vs.85).aspx
		    if(s.addEventListener) {
			s.addEventListener('load',callback,false);
		    }
		    // TODO: Test the following load event polyfill
		    //       (for e.g. IE<=8), and decide if its small
		    //       benefits are worth the small extra size
		    /*
		    else if(s.readyState) {
			// deviating from Microsoft's recommendation,
			// check that the readyState has changed all
			// the way to 'complete' to avoid calling
			// the callback early if any browser sends
			// events for other ready states first
			s.onreadystatechange = function() {
			    if (s.readyState == 'complete') {
				callback;
			    };
			};
		    }
		    */
		    else {
			// fallback to polluting the global namespace
			// (with a name including the very long and
			// cryptic hash value, extremely unlikely to
			// intefere with anything else)
			var globalCallback = 'needcb' + hash;
			binStr = binStr + '\n;' + globalCallback+'()';
			window[globalCallback] = function() {
			    callback();
			    delete window[globalCallback];
			};
		    };
		};
		s.appendChild(document.createTextNode(binStr));
		document.body.appendChild(s);
	    } catch (e) {
		/*dev-only*/ log('Error appending script from' + urls[0]+': '+e);
	    };
//        };
    };

    // TODO: The following hack prevents any character encoding to
    //       affect what exactly we receive, but forcing utf8 instead
    //       may be more appropriate here.

    // Hack to pass bytes through unprocessed. Source:
    // http://www.html5rocks.com/en/tutorials/file/xhr2/
    xhr.overrideMimeType('text/plain; charset=x-user-defined');

    if (callback!==0) {
	// asynchronous case
	xhr.onreadystatechange = function() {
	    if (this.readyState == 4) {
		if (this.status == 200) {
		    process(this.responseText);
		} else {
		    fallback();
		};
	    };
	};
    };
    xhr.ontimeout = fallback;
    xhr.onerror = fallback;
    xhr.send();

    if (callback===0) {
	// synchronous case
	process(xhr.responseText);
    };
});
