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
window.needSHA256 = (function(){
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



window.need = function(urls, hash, extra) {
    /*dev-only*/ "use strict";

    if (extra) {
	// this minimalistic, bootstrapping version of need.js does
	// not support more than 2 parameters: defer call until the
	// full version has been loaded
	setTimeout(function(){window.need(urls, hash, extra)},50)
    }

    var xhr = new XMLHttpRequest();

    var fallback = function() {
	// we only need to call need(..) again because the urls array
	// gets shifted and hence has already been advanced to the
	// next fallback url by the time this might execute
	//
	// NOTE: Without the uncommented code, the asynchronous
	//       exception thrown when all sources fail becomes
	//       somewhat cryptic and likely browser-dependent, as
	//       loading from an undefined(?) url may trigger an
	//       CORS-like security exception rather than something
	//       actually suggestive of the real problem
//	if (urls[0]) {
	    need(urls,hash)
//	} else { throw 'need.js: no source for hash ' + hash; }
    };

    xhr.ontimeout = fallback;
    xhr.onerror = fallback;
    xhr.onreadystatechange = function() {
	if (this.readyState == 4) {
	    if (this.status == 200) {
		// process this.responseText: 
		// check SHA256 and eval/inject or fallback to next url
		if (hash === window.needSHA256(this.responseText)) {
		    // execute the javascript code we loaded in the
		    // window context (that is the global context for
		    // browsers)
		    eval.call(window, this.responseText)
		    return
		}
	    }
	    fallback()
	}
    };

    // The following hack prevents any character encoding to affect
    // what exactly we receive.

    // Hack to pass bytes through unprocessed. Source:
    // http://www.html5rocks.com/en/tutorials/file/xhr2/
    xhr.overrideMimeType('text/plain; charset=x-user-defined');

    xhr.open('GET',urls.shift(),true);
    xhr.send();
}