// Simple API helper functions for vanilla JS
function formatParams(params) {
  return Object.keys(params)
    .map((key) => key + "=" + encodeURIComponent(params[key]))
    .join("&");
}

function convertToJSON(res) {
  if (!res.ok) {
    throw `API request failed with response status ${res.status} and text: ${res.statusText}`;
  }
  return res.json().catch((error) => {
    return res.text().then((text) => {
      throw `API request's result could not be converted to a JSON object: \n${text}`;
    });
  });
}

function get(endpoint, params = {}) {
  const fullPath = endpoint + "?" + formatParams(params);
  return fetch(fullPath, {
    credentials: "include", // Important for session cookies
  })
    .then(convertToJSON)
    .catch((error) => {
      throw `GET request to ${fullPath} failed with error:\n${error}`;
    });
}

function post(endpoint, params = {}) {
  return fetch(endpoint, {
    method: "post",
    headers: { "Content-type": "application/json" },
    credentials: "include", // Important for session cookies
    body: JSON.stringify(params),
  })
    .then(convertToJSON)
    .catch((error) => {
      throw `POST request to ${endpoint} failed with error:\n${error}`;
    });
}

// Make functions available globally
window.get = get;
window.post = post;
