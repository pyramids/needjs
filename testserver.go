package main

import (
	"flag"
	"log"
	"net/http"
	"time"
)

var (
	name = flag.String(
                "name",
                "localhost",
                "HTTP server name (host name with optinal colon-separated port)",
                )
	port = flag.String(
                "port",
                "8080",
                "port for HTTP server",
                )
)

const (
	timeout = time.Duration(25 * time.Second)
	timeoutMsg = "Timeout Error"
)

type NeverHandler struct {}
 
func (nh *NeverHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// this request should always timeout!
	time.Sleep(timeout)
}

func main() {
	flag.Parse()
	http.Handle("/error/404", http.NotFoundHandler())
	http.Handle("/error/timeout", http.TimeoutHandler(&NeverHandler{}, timeout, "Timeout"))
	//http.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir("./"))))
	http.Handle("/", http.FileServer(http.Dir("./")))
	srvname := *name + ":" + *port
	log.Println("Serving test webpage at http://" + srvname + "/tests.html")
	if err := http.ListenAndServe(srvname, nil); err != nil {
		log.Fatal("ListenAndServe: %v", err)
	}
}
