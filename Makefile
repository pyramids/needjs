# remove lines containing /*dev-only*/
REMOVE_DEV_ONLY=sed '/\/\*dev-only\*\//d'

MIN=uglifyjs --lint -c -m

all: need.min.js README.md


need.min.js: need.js
	cat need.js |$(REMOVE_DEV_ONLY) |$(MIN) >need.min.js

need.min.js.gz: need.min.js
	zopfli --i1000 need.min.js >need.min.js.gz

# auto-update README.md with size statistics
README.md: need.min.js need.min.js.gz makestats
	bash ./makestats


clean:
	rm -f *.min.js *.min.js.gz *~

