.PHONY: all run package clean

APP_NAME=chatapp
VERSION=1.0.0

all:
	chmod +x main.py

run:
	python3 main.py

package:
	mkdir -p dist
	tar -czf dist/$(APP_NAME)-$(VERSION)-linux.tar.gz main.py README.md

clean:
	rm -rf dist/
