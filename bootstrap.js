/**
 * @overview Minimalistic version of need.js that excludes any
 * functionality associated with the optional callback object (except
 * to defer it). It can be used to bootstrap loading of the full
 * need.js, and in that use case support its full functionality
 * through deferred handling. Code repository at
 * [https://github.com/pyramids/needjs].
 *
 * @author Björn Stein
 *
 * @license MIT
 *
 */



// sha256 function from sha256.js
// at https://github.com/jbt/js-crypto by James Taylor
// license:
/* By attaching this document to the given files (the “work”), you, the licensee, are hereby granted free usage in both personal and commerical environments, without any obligation of attribution or payment (monetary or otherwise). The licensee is free to use, copy, modify, publish, distribute, sublicence, and/or merchandise the work, subject to the licensee inflecting a positive message unto someone. This includes (but is not limited to): smiling, being nice, saying “thank you”, assisting other persons, or any similar actions percolating the given concept.
The above copyright notice serves as a permissions notice also, and may optionally be included in copies or portions of the work.
The work is provided “as is”, without warranty or support, express or implied. The author(s) are not liable for any damages, misuse, or other claim, whether from or as a consequence of usage of the given work.
*/
needSHA256 = (function(){
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
// DOMStrings have charCodes ranging from 0x00 to 0xFFFF)
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



need = function(urls, hash, extra) {
    "use strict";

    if (extra || !hash) {
	// this minimalistic, bootstrapping version of need.js does
	// not support anything other than 2 parameters: defer call
	// until the full version has been loaded

	// use the knowledge that there will never be more than 3 arguments,
	// and that (this) does not matter to need(..), to shave off a few
	// bytes in calling window.need(..) with same arguments again
	//setTimeout(function(){need.apply(this, arguments)},20);
	setTimeout(function(){need(urls, hash, extra)},20);
	return;
    };

    var xhr = new XMLHttpRequest(), fallbackActive=0;

    if (('withCredentials' in xhr) || (typeof XDomainRequest === 'undefined')) {
	// XMLHttpRequest2 object detected or the IE-only alternative XDomainRequest is not available
	xhr.open('GET',urls.shift(),true);
    } else if (typeof XDomainRequest != "undefined") {
	// Use XDomainRequest
	// (in IE8 and ... possibly nowhere else?)
	xhr = new XDomainRequest();
	xhr.open('GET',urls.shift());
    }

    // only if this was not the last fallback URL: set a timeout
    if (urls[0]) {
	// use global window.needTimeout (for all calls), if the user provided it
	// otherwise, 5s should be enough for a HTTPS connection even if one (single!) packet is lost
	xhr.timeout = window.needTimeout || 5000;
    };

    xhr.ontimeout = fallback;
    xhr.onerror = fallback;
    xhr.onreadystatechange = function() {
	if (this.readyState != 4) {
	    // resource has not been fully loaded yet: do nothing
	    return;
	};

	// is everything ok? then proceed
	if (this.status == 200) {
	    // process this.responseText:
	    // check SHA256 and eval/inject or fallback to next url
	    if (hash === needSHA256(this.responseText)) {
		// execute the javascript code we loaded in the
		// window context (that is the global context for
		// browsers)
		//eval.call(window, this.responseText);
		
		// alternative to eval(..): 
		// shave off a few bytes, plus give the browser's
		// event loop a chance to catch up after our
		// SHA256 calculation (minimizing the chance that
		// the user gets warned about a script becoming
		// unresponsive), at the expense of delaying
		// script execution slightly
		setTimeout(this.responseText,0);
		return;
	    };
	};

	// We did not successfully finish with the resource from the
	// current URL?  Then fallback to other URL(s).
	fallback();
    };

    // The following hack prevents any character encoding to affect
    // what exactly we receive.

    // Hack to pass bytes through unprocessed. Source:
    // http://www.html5rocks.com/en/tutorials/file/xhr2/
    if (xhr.overrideMimeType) {
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
    };

    xhr.send();

    function fallback() {
	// we only need to call need(..) again because the urls array
	// gets shifted and hence has already been advanced to the
	// next fallback url by the time this might execute
	//
	// NOTE: Without the if-else code (always executing the
	//       then-clause), the asynchronous exception thrown when
	//       all sources fail becomes somewhat cryptic and likely
	//       browser-dependent, as loading from an undefined(?)
	//       url may trigger an CORS-like security exception
	//       rather than something actually suggestive of the real
	//       problem, the empty/missing URL
	if (!fallbackActive++) {
	    if (urls[0]) {
		need(urls,hash)
	    } else { 
		throw 'need.js: no source for hash ' + hash; 
	    };
	} else { 
	    //console.log('de-duplicated fallback invokation');
	};
    };
};