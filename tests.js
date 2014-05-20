
(function(){

    function assertNeedException(timeout, anyException) {
	var okMsg;
	var oldWindowOnerror = window.onerror;
	var any=false;
	if (anyException) {
	    any = true;
	}

	window.onerror = function(errorMsg, url, lineNumber) {
	    if (
		/*(url.indexOf('need.') != -1) && */
//		(anyException || (errorMsg.indexOf('need.js: no source for hash ') != -1))
		(any || (errorMsg.indexOf('need.js: no source for hash ') != -1))
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
		    start();
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

    function doWhen(cond, callback) { (function(){	
	if ('string' === typeof cond) {
	    cond = function() { return eval(cond); }
	}
	var cnt=0;
	var testCb = function() {
	    if (cond()) {
		callback();
	    } else {
		cnt++;
		if (cnt < 100) {
		    setTimeout(testCb, 20);
		};
	    };
	};
	setTimeout(testCb, 30);
    })(); }


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

    var bigjsURL
	= 'https://cdn.jsdelivr.net/zxcvbn/1.0/zxcvbn.js';
    var bigjsURL2
	= 'https://cdnjs.cloudflare.com/ajax/libs/zxcvbn/1.0/zxcvbn.js';
    var bigjsSHA256
        = '95b153f6259a67c3e0a86111d1d180ff1ba793ae8df2c232063350de31eaade1';

    // valid javascript soruce not triggering our jsIsPresent() detection
    var jsBadContent
	= 'https://cdn.jsdelivr.net/alertify.js/0.4.0rc1/alertify.min.js';
    var jsBadContent2
	= 'https://cdn.jsdelivr.net/alertify.js/0.4.0rc1/alertify.js';
    // a path that hopefully results in a "not found" condition
    var urlNotFound
	= '/error/404';
    // a url that does not resolve
    var urlNoHost
        = 'https://dlehforeuihfncrelncferoifheriuchnepofjer.not-even.a.top-level-domain';
    // a url (localhost) that should resolve but time-out due to there not being a webserver (hopefully...)
    var urlTimeOut
	= '/error/timeout';
    var wrongHash = 'incorrect_and_even_invalid_hash';
    var cleanJs = function() {
	window.accounting = null;
    };
    var jsIsPresent = function() {
	return window.accounting;
    };

    var needSHA256async = (function() {
//	var aSha256 = new AsyncSha256();
	// it so happens that AsyncSha256.adigest has the exact
	// interface required for the window.needSHA256 function, so
	// we can use it directly
//	return aSha256.adigest;
	return (new AsyncSha256()).adigest;
    })();

    function runTests(needVersion, bootstrap, name) {

	window.needSHA256 = needVersion.needSHA256;
	window.need = needVersion.need;

	// for disabling window on error
	var woe;

	function onerrorIgnoreCORS(errorMsg, url, lineNumber) {
	    if (errorMsg.indexOf('ERROR_DOM_BAD_URI') !== -1) {
		// selectively ignore this, and only this, error
		return true;
	    }
	    return woe.call(arguments);
	}

	// tests suitable for all versions
	asyncTest('load script, correct hash', function() {
	    expect( 3 );
	    cleanJs();
	    ok( !jsIsPresent(), 'test script not initially present' );
	    need(
		[jsURL],
		jsSHA256
	    );
	    doWhen(
		jsIsPresent,
		function() {
		    okCallback('jsIsPresent()', 'script loaded', true)();
		    cleanJs();
		    ok(eval('!jsIsPresent()'), 'script unloaded (affects later tests)' );
		}
	    );
	});


	asyncTest('large source (zxcvbn.js)', function() {
	    expect( 3 );
	    cleanJs();
	    ok( !jsIsPresent(), 'test script not initially present' );
	    window.zxcvbn_load_hook = function() {
		ok( window.zxcvbn , 'zxcvbn.js loaded.');
		delete window.zxcvbn;
		ok( !window.zxcvbn, 'zxcvbn.js removed.');
		start();
	    };
	    need(
		[bigjsURL],
		bigjsSHA256
	    );
	});

	if (!bootstrap) {
	    asyncTest('custom hash function (async-sha256.js)', function() {
		expect( 3 );
		cleanJs();
		ok( !jsIsPresent(), 'test script not initially present' );
		var oldNeedSHA256 = window.needSHA256;
		window.needSHA256 = needSHA256async;
		need(
		    function(){
			window.needSHA256 = oldNeedSHA256;
			okCallback('jsIsPresent()', 'script loaded', true)();
			cleanJs();
			ok(eval('!jsIsPresent()'), 'script unloaded (affects later tests)' );
		    }, 
		    [jsURL],
		    jsSHA256
		);
	    });

	    asyncTest('custom hash function, large source', function() {
		expect( 3 );
		cleanJs();
		ok( !jsIsPresent(), 'test script not initially present' );
		var oldNeedSHA256 = window.needSHA256;
		window.needSHA256 = needSHA256async;
		
		window.zxcvbn_load_hook = function() {
		    window.needSHA256 = oldNeedSHA256;
		    ok( window.zxcvbn , 'zxcvbn.js loaded.');
		    delete window.zxcvbn;
		    ok( !window.zxcvbn, 'zxcvbn.js removed.');
		    start();
		};
		need(
		    [bigjsURL2],
		    bigjsSHA256
		);
	    });
	};

	asyncTest( 'exception after fallbacks, no callback', function() {
	    expect( 2 );
	    cleanJs();
	    ok( !jsIsPresent(), 'test script not initially present' );
	    // for the bootstrap version, accept any exception
	    assertNeedException(5000, bootstrap);
	    need(
		[jsBadContent, jsBadContent2],
		jsSHA256
	    );
	});

	asyncTest('load script from third fallback url', function() {
	    expect( 3 );
	    cleanJs();
	    ok( !jsIsPresent(), 'test script not initially present' );
	    need(
		[jsBadContent, jsBadContent2, jsURL],
		jsSHA256
	    );
	    doWhen(
		jsIsPresent,
		function() {
		    okCallback('jsIsPresent()', 'script loaded', !true)();
		    cleanJs();
		    ok( !jsIsPresent(), 'script unloaded (affects later tests)' );
		    start();
		}
	    );
	});

	// for some reason, the bootstrap version fails here and in
	// the following tests, throwing (in iceweasel, at least) an
	// exception "NS_ERROR_BAD_URI: Access to restricted URI
	// denied" (maybe due to missing CORS headers?)
	//
	// so from here on forward, let's just ignore that one error message
	woe=window.onerror; window.onerror=onerrorIgnoreCORS;
	QUnit.done(function() { window.onerror = woe; });

	/*bootstrap || */
	asyncTest('load script after 404 url', function() {
	    expect( 3 );
	    cleanJs();

	    ok( !jsIsPresent(), 'test script not initially present' );
	    need(
		[urlNotFound, jsURL],
		jsSHA256
	    );
	    doWhen(
		jsIsPresent,
		function() {
		    okCallback('jsIsPresent()', 'script loaded', !true)();
		    cleanJs();
		    ok( !jsIsPresent(), 'script unloaded (affects later tests)' );
		    start();
		}
	    );
	});

	asyncTest('load script after non-existent url', function() {
	    expect( 3 );
	    cleanJs();
	    ok( !jsIsPresent(), 'test script not initially present' );
	    need(
		[urlNoHost, jsURL],
		jsSHA256
	    );
	    doWhen(
		jsIsPresent,
		function() {
		    okCallback('jsIsPresent()', 'script loaded', !true)();
		    cleanJs();
		    ok( !jsIsPresent(), 'script unloaded (affects later tests)' );
		    start();
		}
	    );
	});

	
	  // bad idea: with current IP (localhost),
	  // there's no timeout---instead, instant "port closed" reply(?)
	asyncTest('load script after time-out url', function() {
	    expect( 3 );
	    cleanJs();
	    ok( !jsIsPresent(), 'test script not initially present' );
	    need(
		[urlTimeOut, jsURL],
		jsSHA256
	    );
	    doWhen(
		jsIsPresent,
		function() {
		    okCallback('jsIsPresent()', 'script loaded', false)();
		    cleanJs();
		    ok( !jsIsPresent(), 'script unloaded (affects later tests)' );
		    start();
		}
	    );
	});


	// the following tests all make use of the callback parameter,
	// which is unavailable in the bootstrap version
	// so add a bootstrap-only tests as replacement, then quit
	if (bootstrap) {

	    // good test (bootstrapping), but as qunit can run it early,
	    // it risks invalidating the other tests
	    /*
	    asyncTest('bootstrap (loading need.min.js)', function() {
		expect( 2 );

		// defer call that cannot be handled by the bootstrap version
		need(
		    okCallback('true', 'deferred need(..) call got executed', true),
		    ['need.min.js'],
    'f643a0fdaa606172d34aad31f3a0fa2206f17ef34c101f88a51d013945721858'// SHA256 of need.min.js
		);

		// bootstrap: load full need.js version
		need(
		    ['need.min.js'],
    'f643a0fdaa606172d34aad31f3a0fa2206f17ef34c101f88a51d013945721858'// SHA256 of need.min.js
		);
		doWhen(
		    function() { return window.need != needVersion.need; }, 
		    okCallback('true', 'bootstrap attempt changed window.need', false)
		);
	    });
	    */

	    return;
	}

	asyncTest('callback function', function() {
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
	    need(
		okCallback('jsIsPresent()', 'script loaded', true), 
		[jsURL],
		jsSHA256
	    );
	});

	asyncTest( 'callback object', function() {
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
	    need(
		{cb: okCallback('jsIsPresent()', 'script loaded', true)}, 
		[jsURL],
		jsSHA256
	    );
	});

	asyncTest( 'load script, filter and regular callback', function() {
	    expect(3);
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
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
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
	    need(
		okCallback('jsIsPresent()', '', true), 
		[jsBadContent, jsURL],
		jsSHA256
	    );
	});

	asyncTest( 'exception after failed fallbacks', function() {
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
	    assertNeedException(5000);
	    need(
		okCallback(false, 'incorrectly accepted bad content', true), 
		[jsBadContent, jsBadContent2],
		jsSHA256
	    );
	});

/*
	asyncTest( 'exception after failed fallbacks, no callback', function() {
	    expect( 1 );
	    cleanJs();
	    assertNeedException(5000);
	    need(
		[jsBadContent, jsBadContent2],
		jsSHA256
	    );
	});
*/

	asyncTest( 'honor 0 flag: no exception after failed fallbacks', function() {
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
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
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
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
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
	    need(
		okCallback('jsIsPresent()', '', true),
		[jsURL, ''],
		wrongHash
	    );
	});

	asyncTest( 'honor \'\' flag when no hash given', function() {
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
	    need(
		okCallback('jsIsPresent()', '', true), 
		[jsURL, '']
	    );
	});

	asyncTest( 'honor \'\' flag, no callback, no hash', function() {
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
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
	    expect( 2 );
	    cleanJs();
	    ok(eval('!jsIsPresent()'), 'script not present initially' );
	    need(
		okCallback('jsIsPresent()', '', true), 
		[jsBadContent, jsURL, ''],
		wrongHash
	    );
	});	
    };

    // wait 5 seconds for tests to finish
//    QUnit.config.testTimeout = 5000 * 2;

    // prime cache to speed up other tests
 //   need(function(){ cleanJs(); runTests(); }, [jsURL],jsSHA256);


    module('Boostrap version bootstrap.min.js');
    runTests(needjsBootstrap, true, 'bootstrap.js');


    var needjsNeedDevStarted = 0;
    QUnit.done(function() {
	if (needjsNeedDevStarted) {
	    return;
	}
	needjsNeedDevStarted = 1;
	module('Development version need.js');
	runTests(needjsNeedDev, false, 'need.js');

	var needjsNeedMinStarted = 0;
	setTimeout(
	    function() {
		QUnit.done(function() {
		    if (needjsNeedMinStarted) {
			return;
		    }
		    needjsNeedMinStarted = 1;
		    module('Production version need.min.js');
		    runTests(needjsNeedMin, false, 'need.min.js');
		});
	    },
	    2000
	);
    });

})();