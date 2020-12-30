package httputil

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
)

func performRequest(r http.Handler, method, path string, body interface{}) *httptest.ResponseRecorder {
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(body)
	req := httptest.NewRequest(method, path, buf)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}
