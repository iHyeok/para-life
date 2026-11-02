// The app files share these (and each other's exports) through window, as they did as CDN scripts
import React from "react";
import * as ReactDOM from "react-dom/client";
import * as marked from "marked";
import DOMPurify from "dompurify";

Object.assign(window, { React, ReactDOM, marked, DOMPurify });
