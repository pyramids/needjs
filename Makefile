# remove lines containing /*dev-only*/
# and sections from /*dev-only-start*/ to /*dev-only-stop*/
REMOVE_DEV_ONLY=awk -f nodev.awk

MIN=uglifyjs --lint -c -m 'eval'

all: need.min.js README.md

docs: jsdox/need.md

jsdox/need.md: need.js
	mkdir -p jsdox
	jsdox need.js --output jsdox

need.min.js: need.js
	cat need.js |$(REMOVE_DEV_ONLY) |$(MIN) >need.min.js

need.min.js.gz: need.min.js
	zopfli --i1000 need.min.js >need.min.js.gz

bootstrap.min.js: bootstrap.js
	cat bootstrap.js |$(REMOVE_DEV_ONLY) |$(MIN) >bootstrap.min.js

bootstrap.min.js.gz: bootstrap.min.js
	zopfli --i1000 bootstrap.min.js >bootstrap.min.js.gz

# auto-update README.md with size statistics
README.md: need.min.js need.min.js.gz bootstrap.min.js.gz makestats
	bash ./makestats

download:
	wget https://raw.githubusercontent.com/ryancdotorg/async-sha256-js/master/async-sha256.js
	mv -f async-sha256.js ext/async-sha256.js

clean:
	rm -f *.min.js *.min.js.gz *~
