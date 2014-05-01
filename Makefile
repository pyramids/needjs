# remove lines containing /*dev-only*/
# and sections from /*dev-only-start*/ to /*dev-only-stop*/
REMOVE_DEV_ONLY=awk -f nodev.awk

MIN=uglifyjs --lint -c -m

all: need.min.js README.md

docs: jsdox/need.md

jsdox/need.md: need.js
	mkdir -p jsdox
	jsdox need.js --output jsdox

need.min.js: need.js
	cat need.js |$(REMOVE_DEV_ONLY) |$(MIN) >need.min.js

need.min.js.gz: need.min.js
	zopfli --i1000 need.min.js >need.min.js.gz

# auto-update README.md with size statistics
README.md: need.min.js need.min.js.gz makestats
	bash ./makestats


clean:
	rm -f *.min.js *.min.js.gz *~
