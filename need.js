/**
 * @FileOverview Load javascript dependencies with integrity check and fallback to multiple source URLs. Code repository at {@link https://github.com/pyramids/needjs}.
 * @author Björn Stein
 * @license MIT-style
 *
 * Goals:
 *  1. Check integrity of files loaded (with a cryptographic hash),
 *     to enable the use of untrusted public or third-party repositories
 *  2. Conditionally load polyfills based on object presence
 *  3. Permit synchronous or asynchronous operation
 *  4. No own dependencies
 */

/*
 * BIG WARNING:
 *
 * Only very minimally tested.
 * Interface and functionality still subject to change.
 *
 * If you want to use this, contribute, to move it into stability!
 *
 */

/*
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

  NOTE:

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

         callback.cb: a string or a function, is teh regular callback

	 callback.filter: a function with string argument returning a
	                  string, can be used to pre-process the
	                  loaded content before execution
			  
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

    xhr=new XMLHttpRequest();
    xhr.open('GET',urls[0],callback!==0);

    // try to log to console, if the browser lets us
    /*dev-only*/ var log = function(msg) { try { console.log(msg) } catch(e) {} };

    var fallback = function() {
	// try again, with the first item of urls (the url that just failed) removed

	// only do the following once,
	// if any browser triggers more than one error handler (ontimeout, onerrror, or load with non-200 HTTP status code)
	fallback = function() {};
	
	/*dev-only*/	log('Need.js: Failed to load ' + urls[0]);
	
	window.need(callback, urls.slice(1), hash);
    };
    
    var process = function(binStr) {
	// check and evaluate javascript data in binStr (if and only if it has the correct SHA256 hash)
	for (var i = 0, len = binStr.length; i < len; ++i) {
	    var byte = binStr.charCodeAt(i) & 0xff;  // byte at offset i
	};
	var actualHash = needSha256(binStr);

	/*dev-only*/ if ('undefined' === typeof hash) {
	    /*dev-only*/ hash = actualHash;
	    /*dev-only*/ log('Need.js called without hash; change to:   need('+((callback!==urls)?callback+', ':'')+JSON.stringify(urls)+', \''+actualHash+'\')');
	/*dev-only*/ }

	if (hash == actualHash) {
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
			binStr = callback.filter(binStr);
		    };
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
	} else {
	    /*dev-only*/ log('Need.js: ' + urls[0] + ' has incorrect hash ' + actualHash);

	    // TODO: Here some logging (to web server?) could be added
	    //       even for production use.  However, in many cases
	    //       the server logs will already show what is
	    //       happening due to the coming fallback request(s).

	    fallback();
	};
    };

    // TODO: The following hack prevents any character encoding to
    //       affect what exactly we receive, but forcing utf8 instead
    //       may be more appropriate here.

    // Hack to pass bytes through unprocessed. Source:
    // http://www.html5rocks.com/en/tutorials/file/xhr2/
    xhr.overrideMimeType('text/plain; charset=x-user-defined');

    if (callback!==0) {
	// asynchronous case
	xhr.onreadystatechange = function(e) {
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
