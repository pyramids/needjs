
(function(){

    function assertNeedException(timeout) {
	var okMsg;
	var oldWindowOnerror = window.onerror;
	window.onerror = function(errorMsg, url, lineNumber) {
	    if (
		/*(url.indexOf('need.') != -1) && */
		    (errorMsg.indexOf('need.js: no source for hash ') != -1)
	    ) {
		window.onerror = oldWindowOnerror;
		oldWindowOnerror = 0;
		// wrong execution context: QUnit won't accept this as ok
//		ok( true, 'exception: '+errorMsg);
//		okMsg = 'Correctly raised exception: '+errorMsg;
		okMsg = ''+errorMsg;
		return true;
	    };
	    return oldWindowOnerror.call(arguments);
	};
	setTimeout(
	    function() {
		if (oldWindowOnerror !== 0) {
		    window.onerror = oldWindowOnerror;
		    oldWindowOnerror = 0;
		    ok( false, 'failed to throw expected exception');
		};
	    },
	    timeout || 
		(Math.max(
		    QUnit.config.testTimeout / 2, 
		    QUnit.config.testTimeout - 1000)
		)
	);
	var fastOkay = function() {
	    if (oldWindowOnerror !== 0) {
		setTimeout(fastOkay, 20);
		return;
	    };
	    if (okMsg) {
		ok( true, okMsg);
		start();
	    };
	}
	setTimeout(fastOkay, 30);
    };


    // create a callback function to be used with QUnit's asyncTest(..)
    // cond: first parameter to QUnit's ok(..); will be eval(..)'d if a string
    // msg: second parameter to QUnit's ok(..)
    // finish: boolean; set to true if this callback ends the current test
    function okCallback(cond, msg, finishTest) {
	return function(param) {
	    if ('string' === typeof cond) {
		ok( eval(cond),  msg);
	    } else {
		ok(cond, msg);
	    };
	    if (finishTest) {
		start();
	    };
	    // make this function useable as (pass-through) callback.filter:
	    // need(callback = {filter: okCallback(..), ..}, ..);
	    return param;
	};	
    };
    

    // a javascript file to test loading,
    // with functions to test if it was successfully loaded and executed,
    // and to remove (clean) it again for new tests
    var jsURL
	= 'https://cdn.jsdelivr.net/accounting.js/0.3.2/accounting.min.js';
    var jsSHA256
	= '1b1589c7a7e1338b07b9164daf283dd9f7cb658cba9752c2e872b813d3b7e5e4';
    var jsLength
	= 3133;
    // valid javascript soruce not triggering our jsIsPresent() detection
    var jsBadContent
	= 'https://cdn.jsdelivr.net/alertify.js/0.4.0rc1/alertify.min.js';
    var jsBadContent2
	= 'https://cdn.jsdelivr.net/alertify.js/0.4.0rc1/alertify.js';
    var wrongHash = 'incorrect_and_even_invalid_hash';
    var cleanJs = function() {
	window.accounting = null;
    };
    var jsIsPresent = function() {
	return window.accounting;
    };

    function runTests() {

/*
	window.onerror=function(a,b,c) {
	    ok(false, "window.onerror: "+a+". "+b+". "+c+".");
	    start();
	    return true;
	};
*/

	asyncTest( 'callback function', function() {
	    expect( 1 );
	    cleanJs();
	    need(
		okCallback('jsIsPresent()', 'script loaded', true), 
		[jsURL],
		jsSHA256
	    );
	});

	asyncTest( 'callback object', function() {
	    expect( 1 );
	    cleanJs();
	    need(
		{cb: okCallback('jsIsPresent()', 'script loaded', true)}, 
		[jsURL],
		jsSHA256
	    );
	});

	asyncTest( 'load script, filter and regular callback', function() {
	    expect( 2);
	    cleanJs();
	    need(
		{ 
		    cb: okCallback(
			'jsIsPresent()', 
			'script loaded', 
			true
		    ),
		    filter: okCallback(
			'arguments[0].length === jsLength', 
			'filter callback, correct length',
			false
		    ),
		}, 
		[jsURL],
		jsSHA256
	    );
	});

	asyncTest( 'fallback after hash mismatch', function() {
	    expect( 1 );
	    cleanJs();
	    need(
		okCallback('jsIsPresent()', '', true), 
		[jsBadContent, jsURL],
		jsSHA256
	    );
	});

	asyncTest( 'exception after failed fallbacks', function() {
	    expect( 1 );
	    cleanJs();
	    assertNeedException();
	    need(
		okCallback(false, 'incorrectly accepted bad content', true), 
		[jsBadContent, jsBadContent2],
		jsSHA256
	    );
	});

	asyncTest( 'exception after failed fallbacks, no callback', function() {
	    expect( 1 );
	    cleanJs();
	    assertNeedException();
	    need(
		[jsBadContent, jsBadContent2],
		jsSHA256
	    );
	});

	asyncTest( 'honor 0 flag: no exception after failed fallbacks', function() {
	    expect( 1 );
	    cleanJs();
	    need(
		okCallback(false, 'incorrectly accepted bad content', true),
		[jsBadContent, jsBadContent2, 0],
		jsSHA256
	    );
	    setTimeout(
		function(){
		    ok(!jsIsPresent(), 'was bad content loaded?');
		    start();
		}, 
		1000
	    );
	});

	asyncTest( 'honor 0 flag: no exception after failed fallbacks, no callback', function() {
	    expect( 1 );
	    cleanJs();
	    need(
		[jsBadContent, jsBadContent2, 0],
		jsSHA256
	    );
	    setTimeout(
		function(){
		    ok(!jsIsPresent(), 'was bad content loaded?');
		    start();
		}, 
		1000
	    );
	});

	asyncTest( 'honor \'\' flag', function() {
	    expect( 1 );
	    cleanJs();
	    need(
		okCallback('jsIsPresent()', '', true),
		[jsURL, ''],
		wrongHash
	    );
	});

	asyncTest( 'honor \'\' flag when no hash given', function() {
	    expect( 1 );
	    cleanJs();
	    need(
		okCallback('jsIsPresent()', '', true), 
		[jsURL, '']
	    );
	});

	asyncTest( 'honor \'\' flag, no callback, no hash', function() {
	    expect( 1 );
	    cleanJs();
	    need(
		[jsURL, '']
	    );
	    var cnt = 0;
	    var tst = function() {
		if (!jsIsPresent()) {
		    cnt++;
		    if (cnt < 6) {
			setTimeout(tst, 50);
			return;
		    }
		}
		okCallback('jsIsPresent()', '', true)();
	    };
	    setTimeout(tst, 50);
	});

	asyncTest( 'honor \'\' flag after fallback', function() {
	    expect( 1 );
	    cleanJs();
	    need(
		okCallback('jsIsPresent()', '', true), 
		[jsBadContent, jsURL, ''],
		wrongHash
	    );
	});	
    };

    // wait 5 seconds for tests to finish
    QUnit.config.testTimeout = 5000;

    // prime cache to speed up other tests
 //   need(function(){ cleanJs(); runTests(); }, [jsURL],jsSHA256);
    runTests();
})();