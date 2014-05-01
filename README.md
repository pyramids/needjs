needjs
======

Browser Javascript loader with integrity checks, failover to
additional sources, callback or synchronous operation.

<b>Warning</b>: 
Mostly untested and under heavy development. Expect bugs.

Statistics
------

Minified and gzipped size is `1159` bytes (auto-updated on Thu May  1 14:23:56 UTC 2014), after removal of development support such as console.log output. If that is too much for you, there is a bootstrap version that minifies and gzips down to `777` bytes whilst compromising only on speed, not on functionality (invocations using unsupported functionality are deferred and should work as soon as the full version has been loaded).

The minified scripts are not included to discourage production use:
This script is largely untested and I wish to encourage you to obtain
the maximum debug information. Please contribute bug fixes.

