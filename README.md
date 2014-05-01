needjs
======

Needjs is an in-rowser resource loader (for Javascript, CSS, etc.)
with integrity checks, failover to additional sources, callback or
synchronous operation. The idea is allow your website to utilize
untrusted sources, such as public CDNs or servers not under your sole
and complete control, without risking either getting undesired content
or inheriting their potential irreliability (in either being up at all
or in serving unaltered content).

<b>Warning 1</b>: Mostly untested and under heavy development. Expect
bugs.

<b>Warning 2</b>: If you want to use this loader to improve security
against external sources injecting malicious code into your site,
consider that you will need to integrity-check, e.g. by using needjs,
for _all_ untrusted content (including what you may mistake as
harmless), and you need to load needjs itself from a safe
source, e.g. by inlining it into your html document or loading it from
your site.

For any hope of securing the integrity of your site
against an adversary that can purposefully change the content
delivered from external sources, you will almost certainly need to
integrity-check _all_(!) external content because it may either be
surprisingly versatile. For example, even CSS now can contain code, in
addition to injecting actual content rather than just styling into
your website, and that is not even assuming that your adversay may
attempt to trigger browser security bugs with chosen content.

Statistics
----------

Minified and gzipped size is `1159` bytes (auto-updated on Thu May  1 14:23:56 UTC 2014), after removal of development support such as console.log output. If that is too much for you, there is a bootstrap version that minifies and gzips down to `777` bytes whilst compromising only on speed, not on functionality (invocations using unsupported functionality are deferred and should work as soon as the full version has been loaded).

The minified scripts are not included to discourage production use:
This script is largely untested and I wish to encourage you to obtain
the maximum debug information. Please contribute bug fixes.

Alternatives
------------

There are lots of javascript, and even more general resource
loaders. Yet currently, I am only aware of a single full alternative
for loading resources with integrity checks and fallback to
alternative sources,
[VerifyJS](https://github.com/ryancdotorg/VerifyJS). Unlike needjs,
VerifyJS even comes with a license designed to prevent you from being
allowed to commit the worst security blunder in using an integrity
verifier for external sources, namely loading the
integrity-verification library itself from an external (and hence
potentially untrusted) source.