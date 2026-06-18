package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type status struct {
	Service string `json:"service"`
	OK      bool   `json:"ok"`
}

func main() {
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(status{Service: "viewer-api", OK: true})
	})
	log.Fatal(http.ListenAndServe(":8080", nil))
}
