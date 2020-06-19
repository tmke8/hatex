(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  const zeroPad = n => n < 10 ? '0' + n : n;

  const RFC = function(date) {
    const day = days[date.getDay()].substring(0, 3);
    const paddedDate = zeroPad(date.getDate());
    const month = months[date.getMonth()].substring(0,3);
    const year = date.getFullYear().toString();
    const hours = date.getUTCHours().toString();
    const minutes = date.getUTCMinutes().toString();
    const seconds = date.getUTCSeconds().toString();
    return `${day}, ${paddedDate} ${month} ${year} ${hours}:${minutes}:${seconds} Z`;
  };

  const objectFromMap = function(map) {
    const object = Array.from(map).reduce((object, [key, value]) => (
      Object.assign(object, { [key]: value }) // Be careful! Maps can have non-String keys; object literals can't.
    ), {});
    return object;
  };

  const mapFromObject = function(object) {
    const map = new Map();
    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        map.set(property, object[property]);
      }
    }
    return map;
  };

  class Author {

    // constructor(name='', personalURL='', affiliation='', affiliationURL='') {
    //   this.name = name; // 'Chris Olah'
    //   this.personalURL = personalURL; // 'https://colah.github.io'
    //   this.affiliation = affiliation; // 'Google Brain'
    //   this.affiliationURL = affiliationURL; // 'https://g.co/brain'
    // }

    constructor(object) {
      this.name = object.author; // 'Chris Olah'
      this.personalURL = object.authorURL; // 'https://colah.github.io'
      this.affiliation = object.affiliation; // 'Google Brain'
      this.affiliationURL = object.affiliationURL; // 'https://g.co/brain'
      this.affiliations = object.affiliations || []; // new-style affiliations
    }

    // 'Chris'
    get firstName() {
      const names = this.name.split(' ');
      return names.slice(0, names.length - 1).join(' ');
    }

    // 'Olah'
    get lastName() {
      const names = this.name.split(' ');
      return names[names.length -1];
    }
  }

  function mergeFromYMLFrontmatter(target, source) {
    target.title = source.title;
    if (source.published) {
      if (source.published instanceof Date) {
        target.publishedDate = source.published;
      } else if (source.published.constructor === String) {
        target.publishedDate = new Date(source.published);
      }
    }
    if (source.publishedDate) {
      if (source.publishedDate instanceof Date) {
        target.publishedDate = source.publishedDate;
      } else if (source.publishedDate.constructor === String) {
        target.publishedDate = new Date(source.publishedDate);
      } else {
        console.error('Don\'t know what to do with published date: ' + source.publishedDate);
      }
    }
    target.description = source.description;
    target.authors = source.authors.map( (authorObject) => new Author(authorObject));
    target.katex = source.katex;
    target.password = source.password;
    if (source.doi) {
      target.doi = source.doi;
    }
  }

  class FrontMatter {
    constructor() {
      this.title = 'unnamed article'; // 'Attention and Augmented Recurrent Neural Networks'
      this.description = ''; // 'A visual overview of neural attention...'
      this.authors = []; // Array of Author(s)

      this.bibliography = new Map();
      this.bibliographyParsed = false;
      //  {
      //    'gregor2015draw': {
      //      'title': 'DRAW: A recurrent neural network for image generation',
      //      'author': 'Gregor, Karol and Danihelka, Ivo and Graves, Alex and Rezende, Danilo Jimenez and Wierstra, Daan',
      //      'journal': 'arXiv preprint arXiv:1502.04623',
      //      'year': '2015',
      //      'url': 'https://arxiv.org/pdf/1502.04623.pdf',
      //      'type': 'article'
      //    },
      //  }

      // Citation keys should be listed in the order that they are appear in the document.
      // Each key refers to a key in the bibliography dictionary.
      this.citations = []; // [ 'gregor2015draw', 'mercier2011humans' ]
      this.citationsCollected = false;

      //
      // Assigned from posts.csv
      //

      //  publishedDate: 2016-09-08T07:00:00.000Z,
      //  tags: [ 'rnn' ],
      //  distillPath: '2016/augmented-rnns',
      //  githubPath: 'distillpub/post--augmented-rnns',
      //  doiSuffix: 1,

      //
      // Assigned from journal
      //
      this.journal = {};
      //  journal: {
      //    'title': 'Distill',
      //    'full_title': 'Distill',
      //    'abbrev_title': 'Distill',
      //    'url': 'http://distill.pub',
      //    'doi': '10.23915/distill',
      //    'publisherName': 'Distill Working Group',
      //    'publisherEmail': 'admin@distill.pub',
      //    'issn': '2476-0757',
      //    'editors': [...],
      //    'committee': [...]
      //  }
      //  volume: 1,
      //  issue: 9,

      this.katex = {};

      //
      // Assigned from publishing process
      //

      //  githubCompareUpdatesUrl: 'https://github.com/distillpub/post--augmented-rnns/compare/1596e094d8943d2dc0ea445d92071129c6419c59...3bd9209e0c24d020f87cf6152dcecc6017cbc193',
      //  updatedDate: 2017-03-21T07:13:16.000Z,
      //  doi: '10.23915/distill.00001',
      this.doi = undefined;
      this.publishedDate = undefined;
    }

    // Example:
    // title: Demo Title Attention and Augmented Recurrent Neural Networks
    // published: Jan 10, 2017
    // authors:
    // - Chris Olah:
    // - Shan Carter: http://shancarter.com
    // affiliations:
    // - Google Brain:
    // - Google Brain: http://g.co/brain

    //
    // Computed Properties
    //

    // 'http://distill.pub/2016/augmented-rnns',
    set url(value) {
      this._url = value;
    }
    get url() {
      if (this._url) {
        return this._url;
      } else if (this.distillPath && this.journal.url) {
        return this.journal.url + '/' + this.distillPath;
      } else if (this.journal.url) {
        return this.journal.url;
      }
    }

    // 'https://github.com/distillpub/post--augmented-rnns',
    get githubUrl() {
      if (this.githubPath) {
        return 'https://github.com/' + this.githubPath;
      } else {
        return undefined;
      }
    }

    // TODO resolve differences in naming of URL/Url/url.
    // 'http://distill.pub/2016/augmented-rnns/thumbnail.jpg',
    set previewURL(value) {
      this._previewURL = value;
    }
    get previewURL() {
      return this._previewURL ? this._previewURL : this.url + '/thumbnail.jpg';
    }

    // 'Thu, 08 Sep 2016 00:00:00 -0700',
    get publishedDateRFC() {
      return RFC(this.publishedDate);
    }

    // 'Thu, 08 Sep 2016 00:00:00 -0700',
    get updatedDateRFC() {
      return RFC(this.updatedDate);
    }

    // 2016,
    get publishedYear() {
      return this.publishedDate.getFullYear();
    }

    // 'Sept',
    get publishedMonth() {
      return months[this.publishedDate.getMonth()];
    }

    // 8,
    get publishedDay() {
      return this.publishedDate.getDate();
    }

    // '09',
    get publishedMonthPadded() {
      return zeroPad(this.publishedDate.getMonth() + 1);
    }

    // '08',
    get publishedDayPadded() {
      return zeroPad(this.publishedDate.getDate());
    }

    get publishedISODateOnly() {
      return this.publishedDate.toISOString().split('T')[0];
    }

    get volume() {
      const volume = this.publishedYear - 2015;
      if (volume < 1) {
        throw new Error('Invalid publish date detected during computing volume');
      }
      return volume;
    }

    get issue() {
      return this.publishedDate.getMonth() + 1;
    }

    // 'Olah & Carter',
    get concatenatedAuthors() {
      if (this.authors.length > 2) {
        return this.authors[0].lastName + ', et al.';
      } else if (this.authors.length === 2) {
        return this.authors[0].lastName + ' & ' + this.authors[1].lastName;
      } else if (this.authors.length === 1) {
        return this.authors[0].lastName;
      }
    }

    // 'Olah, Chris and Carter, Shan',
    get bibtexAuthors() {
      return this.authors.map(author => {
        return author.lastName + ', ' + author.firstName;
      }).join(' and ');
    }

    // 'olah2016attention'
    get slug() {
      let slug = '';
      if (this.authors.length) {
        slug += this.authors[0].lastName.toLowerCase();
        slug += this.publishedYear;
        slug += this.title.split(' ')[0].toLowerCase();
      }
      return slug || 'Untitled';
    }

    get bibliographyEntries() {
      return new Map(this.citations.map( citationKey => {
        const entry = this.bibliography.get(citationKey);
        return [citationKey, entry];
      }));
    }

    set bibliography(bibliography) {
      if (bibliography instanceof Map) {
        this._bibliography = bibliography;
      } else if (typeof bibliography === 'object') {
        this._bibliography = mapFromObject(bibliography);
      }
    }

    get bibliography() {
      return this._bibliography;
    }

    static fromObject(source) {
      const frontMatter = new FrontMatter();
      Object.assign(frontMatter, source);
      return frontMatter;
    }

    assignToObject(target) {
      Object.assign(target, this);
      target.bibliography = objectFromMap(this.bibliographyEntries);
      target.url = this.url;
      target.doi = this.doi;
      target.githubUrl = this.githubUrl;
      target.previewURL = this.previewURL;
      if (this.publishedDate) {
        target.volume = this.volume;
        target.issue = this.issue;
        target.publishedDateRFC = this.publishedDateRFC;
        target.publishedYear = this.publishedYear;
        target.publishedMonth = this.publishedMonth;
        target.publishedDay = this.publishedDay;
        target.publishedMonthPadded = this.publishedMonthPadded;
        target.publishedDayPadded = this.publishedDayPadded;
      }
      if (this.updatedDate) {
        target.updatedDateRFC = this.updatedDateRFC;
      }
      target.concatenatedAuthors = this.concatenatedAuthors;
      target.bibtexAuthors = this.bibtexAuthors;
      target.slug = this.slug;
    }

  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  const Mutating = (superclass) => {
    return class extends superclass {

      constructor() {
        super();

        // set up mutation observer
        const options = {childList: true, characterData: true, subtree: true};
        const observer = new MutationObserver( () => {
          observer.disconnect();
          this.renderIfPossible();
          observer.observe(this, options);
        });

        // ...and listen for changes
        observer.observe(this, options);
      }

      connectedCallback() {
        super.connectedCallback();

        this.renderIfPossible();
      }

      // potential TODO: check if this is enough for all our usecases
      // maybe provide a custom function to tell if we have enough information to render
      renderIfPossible() {
        if (this.textContent && this.root) {
          this.renderContent();
        }
      }

      renderContent() {
        console.error(`Your class ${this.constructor.name} must provide a custom renderContent() method!` );
      }

    }; // end class
  }; // end mixin function

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  /*global ShadyCSS*/

  const Template = (name, templateString, useShadow = true) => {

    return (superclass) => {

      const template = document.createElement('template');
      template.innerHTML = templateString;

      if (useShadow && 'ShadyCSS' in window) {
        ShadyCSS.prepareTemplate(template, name);
      }

      return class extends superclass {

        static get is() { return name; }

        constructor() {
          super();

          this.clone = document.importNode(template.content, true);
          if (useShadow) {
            this.attachShadow({mode: 'open'});
            this.shadowRoot.appendChild(this.clone);
          }
        }

        connectedCallback() {
          if (this.hasAttribute('distill-prerendered')) {
            return;
          }
          if (useShadow) {
            if ('ShadyCSS' in window) {
              ShadyCSS.styleElement(this);
            }
          } else {
            this.insertBefore(this.clone, this.firstChild);
          }
        }

        get root() {
          if (useShadow) {
            return this.shadowRoot;
          } else {
            return this;
          }
        }

        /* TODO: Are we using these? Should we even? */
        $(query) {
          return this.root.querySelector(query);
        }

        $$(query) {
          return this.root.querySelectorAll(query);
        }
      };
    };
  };

  var math = "/*\n * Copyright 2018 The Distill Template Authors\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *      http://www.apache.org/licenses/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n */\n\nspan.katex-display {\n  /* text-align: left; */\n  padding: 8px 0 8px 0;\n  margin: 0.5em 0 0.5em 1em;\n}\n\nspan.katex {\n  -webkit-font-smoothing: antialiased;\n  color: rgba(0, 0, 0, 0.8);\n  font-size: 1.18em;\n}\n";

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // This is a straight concatenation of code from KaTeX's contrib folder,
  // but we aren't using some of their helpers that don't work well outside a browser environment.

  /*global katex */

  const findEndOfMath = function(delimiter, text, startIndex) {
    // Adapted from
    // https://github.com/Khan/perseus/blob/master/src/perseus-markdown.jsx
    let index = startIndex;
    let braceLevel = 0;

    const delimLength = delimiter.length;

    while (index < text.length) {
      const character = text[index];

      if (
        braceLevel <= 0 &&
        text.slice(index, index + delimLength) === delimiter
      ) {
        return index;
      } else if (character === "\\") {
        index++;
      } else if (character === "{") {
        braceLevel++;
      } else if (character === "}") {
        braceLevel--;
      }

      index++;
    }

    return -1;
  };

  const splitAtDelimiters = function(startData, leftDelim, rightDelim, display) {
    const finalData = [];

    for (let i = 0; i < startData.length; i++) {
      if (startData[i].type === "text") {
        const text = startData[i].data;

        let lookingForLeft = true;
        let currIndex = 0;
        let nextIndex;

        nextIndex = text.indexOf(leftDelim);
        if (nextIndex !== -1) {
          currIndex = nextIndex;
          finalData.push({
            type: "text",
            data: text.slice(0, currIndex)
          });
          lookingForLeft = false;
        }

        while (true) {
          // eslint-disable-line no-constant-condition
          if (lookingForLeft) {
            nextIndex = text.indexOf(leftDelim, currIndex);
            if (nextIndex === -1) {
              break;
            }

            finalData.push({
              type: "text",
              data: text.slice(currIndex, nextIndex)
            });

            currIndex = nextIndex;
          } else {
            nextIndex = findEndOfMath(
              rightDelim,
              text,
              currIndex + leftDelim.length
            );
            if (nextIndex === -1) {
              break;
            }

            finalData.push({
              type: "math",
              data: text.slice(currIndex + leftDelim.length, nextIndex),
              rawData: text.slice(currIndex, nextIndex + rightDelim.length),
              display: display
            });

            currIndex = nextIndex + rightDelim.length;
          }

          lookingForLeft = !lookingForLeft;
        }

        finalData.push({
          type: "text",
          data: text.slice(currIndex)
        });
      } else {
        finalData.push(startData[i]);
      }
    }

    return finalData;
  };

  const splitWithDelimiters = function(text, delimiters) {
    let data = [{ type: "text", data: text }];
    for (let i = 0; i < delimiters.length; i++) {
      const delimiter = delimiters[i];
      data = splitAtDelimiters(
        data,
        delimiter.left,
        delimiter.right,
        delimiter.display || false
      );
    }
    return data;
  };

  /* Note: optionsCopy is mutated by this method. If it is ever exposed in the
   * API, we should copy it before mutating.
   */
  const renderMathInText = function(text, optionsCopy) {
    const data = splitWithDelimiters(text, optionsCopy.delimiters);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < data.length; i++) {
      if (data[i].type === "text") {
        fragment.appendChild(document.createTextNode(data[i].data));
      } else {
        const tag = document.createElement("d-math");
        const math = data[i].data;
        // Override any display mode defined in the settings with that
        // defined by the text itself
        optionsCopy.displayMode = data[i].display;
        try {
          tag.textContent = math;
          if (optionsCopy.displayMode) {
            tag.setAttribute("block", "");
          }
        } catch (e) {
          if (!(e instanceof katex.ParseError)) {
            throw e;
          }
          optionsCopy.errorCallback(
            "KaTeX auto-render: Failed to parse `" + data[i].data + "` with ",
            e
          );
          fragment.appendChild(document.createTextNode(data[i].rawData));
          continue;
        }
        fragment.appendChild(tag);
      }
    }

    return fragment;
  };

  const renderElem = function(elem, optionsCopy) {
    for (let i = 0; i < elem.childNodes.length; i++) {
      const childNode = elem.childNodes[i];
      if (childNode.nodeType === 3) {
        // Text node
        const text = childNode.textContent;
        if (optionsCopy.mightHaveMath(text)) {
          const frag = renderMathInText(text, optionsCopy);
          i += frag.childNodes.length - 1;
          elem.replaceChild(frag, childNode);
        }
      } else if (childNode.nodeType === 1) {
        // Element node
        const shouldRender =
          optionsCopy.ignoredTags.indexOf(childNode.nodeName.toLowerCase()) ===
          -1;

        if (shouldRender) {
          renderElem(childNode, optionsCopy);
        }
      }
      // Otherwise, it's something else, and ignore it.
    }
  };

  const defaultAutoRenderOptions = {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false }
      // LaTeX uses this, but it ruins the display of normal `$` in text:
      // {left: '$', right: '$', display: false},
    ],

    ignoredTags: [
      "script",
      "noscript",
      "style",
      "textarea",
      "pre",
      "code",
      "svg"
    ],

    errorCallback: function(msg, err) {
      console.error(msg, err);
    }
  };

  const renderMathInElement = function(elem, options) {
    if (!elem) {
      throw new Error("No element provided to render");
    }

    const optionsCopy = Object.assign({}, defaultAutoRenderOptions, options);
    const delimiterStrings = optionsCopy.delimiters.flatMap(d => [
      d.left,
      d.right
    ]);
    const mightHaveMath = text =>
      delimiterStrings.some(d => text.indexOf(d) !== -1);
    optionsCopy.mightHaveMath = mightHaveMath;
    renderElem(elem, optionsCopy);
  };

  // Copyright 2018 The Distill Template Authors

  const katexJSURL = 'https://distill.pub/third-party/katex/katex.min.js';
  const katexCSSTag = '<link rel="stylesheet" href="https://distill.pub/third-party/katex/katex.min.css" crossorigin="anonymous">';

  const T = Template('d-math', `
${katexCSSTag}
<style>

:host {
  display: inline-block;
  contain: style;
  text-indent: 0;
}

:host([block]) {
  display: block;
}

${math}
</style>
<span id='katex-container'></span>
`);

  // DMath, not Math, because that would conflict with the JS built-in
  class DMath extends Mutating(T(HTMLElement)) {

    static set katexOptions(options) {
      DMath._katexOptions = options;
      if (DMath.katexOptions.delimiters) {
        if (!DMath.katexAdded) {
          DMath.addKatex();
        } else {
          DMath.katexLoadedCallback();
        }
      }
    }

    static get katexOptions() {
      if (!DMath._katexOptions) {
        DMath._katexOptions = {
          delimiters: [ { 'left':'$$', 'right':'$$', 'display': false } ]
        };
      }
      return DMath._katexOptions;
    }

    static katexLoadedCallback() {
      // render all d-math tags
      const mathTags = document.querySelectorAll('d-math');
      for (const mathTag of mathTags) {
        mathTag.renderContent();
      }
      // transform inline delimited math to d-math tags
      if (DMath.katexOptions.delimiters) {
        renderMathInElement(document.body, DMath.katexOptions);
      }
    }

    static addKatex() {
      // css tag can use this convenience function
      document.head.insertAdjacentHTML('beforeend', katexCSSTag);
      // script tag has to be created to work properly
      const scriptTag = document.createElement('script');
      scriptTag.src = katexJSURL;
      scriptTag.async = true;
      scriptTag.onload = DMath.katexLoadedCallback;
      scriptTag.crossorigin = 'anonymous';
      document.head.appendChild(scriptTag);

      DMath.katexAdded = true;
    }

    get options() {
      const localOptions = { displayMode: this.hasAttribute('block') };
      return Object.assign(localOptions, DMath.katexOptions);
    }

    connectedCallback() {
      super.connectedCallback();
      if (!DMath.katexAdded) {
        DMath.addKatex();
      }
    }

    renderContent() {
      if (typeof katex !== 'undefined') {
        const container = this.root.querySelector('#katex-container');
        katex.render(this.textContent, container, this.options);
      }
    }

  }

  DMath.katexAdded = false;
  DMath.inlineMathRendered = false;
  window.DMath = DMath; // TODO: check if this can be removed, or if we should expose a distill global

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  function collect_citations(dom = document) {
    const citations = new Set();
    const citeTags = dom.querySelectorAll("d-cite");
    for (const tag of citeTags) {
      const keyString = tag.getAttribute("key") || tag.getAttribute("bibtex-key");
      const keys = keyString.split(",").map(k => k.trim());
      for (const key of keys) {
        citations.add(key);
      }
    }
    return [...citations];
  }

  function author_string(ent, template, sep, finalSep) {
    if (ent.author == null) {
      return "";
    }
    var names = ent.author.split(" and ");
    let name_strings = names.map(name => {
      name = name.trim();
      if (name.indexOf(",") != -1) {
        var last = name.split(",")[0].trim();
        var firsts = name.split(",")[1];
      } else if (name.indexOf(" ") != -1) {
        var last = name
          .split(" ")
          .slice(-1)[0]
          .trim();
        var firsts = name
          .split(" ")
          .slice(0, -1)
          .join(" ");
      } else {
        var last = name.trim();
      }
      var initials = "";
      if (firsts != undefined) {
        initials = firsts
          .trim()
          .split(" ")
          .map(s => s.trim()[0]);
        initials = initials.join(".") + ".";
      }
      return template
        .replace("${F}", firsts)
        .replace("${L}", last)
        .replace("${I}", initials)
        .trim(); // in case one of first or last was empty
    });
    if (names.length > 1) {
      var str = name_strings.slice(0, names.length - 1).join(sep);
      str += (finalSep || sep) + name_strings[names.length - 1];
      return str;
    } else {
      return name_strings[0];
    }
  }

  function venue_string(ent) {
    var cite = ent.journal || ent.booktitle || "";
    if ("volume" in ent) {
      var issue = ent.issue || ent.number;
      issue = issue != undefined ? "(" + issue + ")" : "";
      cite += ", Vol " + ent.volume + issue;
    }
    if ("pages" in ent) {
      cite += ", pp. " + ent.pages;
    }
    if (cite != "") cite += ". ";
    if ("publisher" in ent) {
      cite += ent.publisher;
      if (cite[cite.length - 1] != ".") cite += ".";
    }
    return cite;
  }

  function link_string(ent) {
    if ("url" in ent) {
      var url = ent.url;
      var arxiv_match = /arxiv\.org\/abs\/([0-9\.]*)/.exec(url);
      if (arxiv_match != null) {
        url = `http://arxiv.org/pdf/${arxiv_match[1]}.pdf`;
      }

      if (url.slice(-4) == ".pdf") {
        var label = "PDF";
      } else if (url.slice(-5) == ".html") {
        var label = "HTML";
      }
      return ` &ensp;<a href="${url}">[${label || "link"}]</a>`;
    } /* else if ("doi" in ent){
      return ` &ensp;<a href="https://doi.org/${ent.doi}" >[DOI]</a>`;
    }*/ else {
      return "";
    }
  }
  function doi_string(ent, new_line) {
    if ("doi" in ent) {
      return `${new_line ? "<br>" : ""} <a href="https://doi.org/${
      ent.doi
    }" style="text-decoration:inherit;">DOI: ${ent.doi}</a>`;
    } else {
      return "";
    }
  }

  function title_string(ent) {
    return '<span class="title">' + ent.title + "</span> ";
  }

  function bibliography_cite(ent, fancy) {
    if (ent) {
      var cite = title_string(ent);
      cite += link_string(ent) + "<br>";
      if (ent.author) {
        cite += author_string(ent, "${L}, ${I}", ", ", " and ");
        if (ent.year || ent.date) {
          cite += ", ";
        }
      }
      if (ent.year || ent.date) {
        cite += (ent.year || ent.date) + ". ";
      } else {
        cite += ". ";
      }
      cite += venue_string(ent);
      cite += doi_string(ent);
      return cite;
      /*var cite =  author_string(ent, "${L}, ${I}", ", ", " and ");
      if (ent.year || ent.date){
        cite += ", " + (ent.year || ent.date) + ". "
      } else {
        cite += ". "
      }
      cite += "<b>" + ent.title + "</b>. ";
      cite += venue_string(ent);
      cite += doi_string(ent);
      cite += link_string(ent);
      return cite*/
    } else {
      return "?";
    }
  }

  function hover_cite(ent) {
    if (ent) {
      var cite = "";
      cite += "<strong>" + ent.title + "</strong>";
      cite += link_string(ent);
      cite += "<br>";

      var a_str = author_string(ent, "${I} ${L}", ", ") + ".";
      var v_str =
        venue_string(ent).trim() + " " + ent.year + ". " + doi_string(ent, true);

      if ((a_str + v_str).length < Math.min(40, ent.title.length)) {
        cite += a_str + " " + v_str;
      } else {
        cite += a_str + "<br>" + v_str;
      }
      return cite;
    } else {
      return "?";
    }
  }

  function domContentLoaded() {
    return ['interactive', 'complete'].indexOf(document.readyState) !== -1;
  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  function _moveLegacyAffiliationFormatIntoArray(frontMatter) {
    // authors used to have propoerties "affiliation" and "affiliationURL".
    // We now encourage using an array for affiliations containing objects with
    // properties "name" and "url".
    for (let author of frontMatter.authors) {
      const hasOldStyle = Boolean(author.affiliation);
      const hasNewStyle = Boolean(author.affiliations);
      if (!hasOldStyle) continue;
      if (hasNewStyle) {
        console.warn(`Author ${author.author} has both old-style ("affiliation" & "affiliationURL") and new style ("affiliations") affiliation information!`);
      } else {
        let newAffiliation = {
          "name": author.affiliation
        };
        if (author.affiliationURL) newAffiliation.url = author.affiliationURL;
        author.affiliations = [newAffiliation];
      }
    }
    return frontMatter
  }

  function parseFrontmatter(element) {
    const scriptTag = element.firstElementChild;
    if (scriptTag) {
      const type = scriptTag.getAttribute('type');
      if (type.split('/')[1] == 'json') {
        const content = scriptTag.textContent;
        const parsed = JSON.parse(content);
        return _moveLegacyAffiliationFormatIntoArray(parsed);
      } else {
        console.error('Distill only supports JSON frontmatter tags anymore; no more YAML.');
      }
    } else {
      console.error('You added a frontmatter tag but did not provide a script tag with front matter data in it. Please take a look at our templates.');
    }
    return {};
  }

  class FrontMatter$1 extends HTMLElement {

    static get is() { return 'd-front-matter'; }

    constructor() {
      super();

      const options = {childList: true, characterData: true, subtree: true};
      const observer = new MutationObserver( (entries) => {
        for (const entry of entries) {
          if (entry.target.nodeName === 'SCRIPT' || entry.type === 'characterData') {
            const data = parseFrontmatter(this);
            this.notify(data);
          }
        }
      });
      observer.observe(this, options);
    }

    notify(data) {
      const options = { detail: data, bubbles: true };
      const event = new CustomEvent('onFrontMatterChanged', options);
      document.dispatchEvent(event);
    }

  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // no appendix -> add appendix
  // title in front, no h1 -> add it
  // no title in front, h1 -> read and put into frontMatter
  // footnote -> footnote list
  // break up bib
  // if citation, no bib-list -> add citation-list

  // if authors, no byline -> add byline

  function optionalComponents(dom, data) {
    const body = dom.body;
    const article = body.querySelector('article');

    // If we don't have an article tag, something weird is going on—giving up.
    if (!article) {
      console.warn('No article tag found; skipping adding optional components!');
      return;
    }

    let byline = dom.querySelector('d-byline');
    if (!byline) {
      if (data.authors) {
        byline = dom.createElement('d-byline');
        body.insertBefore(byline, article);
      } else {
        console.warn('No authors found in front matter; please add them before submission!');
      }
    }

    let title = dom.querySelector('d-title');
    if (!title) {
      title = dom.createElement('d-title');
      body.insertBefore(title, byline);
    }

    let h1 = title.querySelector('h1');
    if (!h1) {
      h1 = dom.createElement('h1');
      h1.id = "document-title";
      h1.textContent = data.title;
      title.insertBefore(h1, title.firstChild);
    }

    const hasPassword = typeof data.password !== 'undefined';
    let interstitial = body.querySelector('d-interstitial');
    if (hasPassword && !interstitial) {
      const inBrowser = typeof window !== 'undefined';
      const onLocalhost = inBrowser && window.location.hostname.includes('localhost');
      if (!inBrowser || !onLocalhost) {
        interstitial = dom.createElement('d-interstitial');
        interstitial.password = data.password;
        body.insertBefore(interstitial, body.firstChild);
      }
    } else if (!hasPassword && interstitial) {
      interstitial.parentElement.removeChild(this);
    }

    let appendix = dom.querySelector('d-appendix');
    if (!appendix) {
      appendix = dom.createElement('d-appendix');
      dom.body.appendChild(appendix);
    }

    let footnoteList = dom.querySelector('d-footnote-list');
    if (!footnoteList) {
      footnoteList = dom.createElement('d-footnote-list');
      appendix.appendChild(footnoteList);
    }

    let citationList = dom.querySelector('d-citation-list');
    if (!citationList) {
      citationList = dom.createElement('d-citation-list');
      appendix.appendChild(citationList);
    }

  }

  // Copyright 2018 The Distill Template Authors

  const frontMatter = new FrontMatter();

  const Controller = {
    frontMatter: frontMatter,
    waitingOn: {
      bibliography: [],
      citations: []
    },
    listeners: {
      onCiteKeyCreated(event) {
        const [citeTag, keys] = event.detail;

        // ensure we have citations
        if (!frontMatter.citationsCollected) {
          // console.debug('onCiteKeyCreated, but unresolved dependency ("citations"). Enqueing.');
          Controller.waitingOn.citations.push(() =>
            Controller.listeners.onCiteKeyCreated(event)
          );
          return;
        }

        // ensure we have a loaded bibliography
        if (!frontMatter.bibliographyParsed) {
          // console.debug('onCiteKeyCreated, but unresolved dependency ("bibliography"). Enqueing.');
          Controller.waitingOn.bibliography.push(() =>
            Controller.listeners.onCiteKeyCreated(event)
          );
          return;
        }

        const numbers = keys.map(key => frontMatter.citations.indexOf(key));
        citeTag.numbers = numbers;
        const entries = keys.map(key => frontMatter.bibliography.get(key));
        citeTag.entries = entries;
      },

      onCiteKeyChanged() {
        // const [citeTag, keys] = event.detail;

        // update citations
        frontMatter.citations = collect_citations();
        frontMatter.citationsCollected = true;
        for (const waitingCallback of Controller.waitingOn.citations.slice()) {
          waitingCallback();
        }

        // update bibliography
        const citationListTag = document.querySelector("d-citation-list");
        const bibliographyEntries = new Map(
          frontMatter.citations.map(citationKey => {
            return [citationKey, frontMatter.bibliography.get(citationKey)];
          })
        );
        citationListTag.citations = bibliographyEntries;

        const citeTags = document.querySelectorAll("d-cite");
        for (const citeTag of citeTags) {
          console.log(citeTag);
          const keys = citeTag.keys;
          const numbers = keys.map(key => frontMatter.citations.indexOf(key));
          citeTag.numbers = numbers;
          const entries = keys.map(key => frontMatter.bibliography.get(key));
          citeTag.entries = entries;
        }
      },

      onCiteKeyRemoved(event) {
        Controller.listeners.onCiteKeyChanged(event);
      },

      onBibliographyChanged(event) {
        const citationListTag = document.querySelector("d-citation-list");

        const bibliography = event.detail;

        frontMatter.bibliography = bibliography;
        frontMatter.bibliographyParsed = true;
        for (const waitingCallback of Controller.waitingOn.bibliography.slice()) {
          waitingCallback();
        }

        // ensure we have citations
        if (!frontMatter.citationsCollected) {
          Controller.waitingOn.citations.push(function() {
            Controller.listeners.onBibliographyChanged({
              target: event.target,
              detail: event.detail
            });
          });
          return;
        }

        if (citationListTag.hasAttribute("distill-prerendered")) {
          console.debug("Citation list was prerendered; not updating it.");
        } else {
          const entries = new Map(
            frontMatter.citations.map(citationKey => {
              return [citationKey, frontMatter.bibliography.get(citationKey)];
            })
          );
          citationListTag.citations = entries;
        }
      },

      onFootnoteChanged() {
        // const footnote = event.detail;
        //TODO: optimize to only update current footnote
        const footnotesList = document.querySelector("d-footnote-list");
        if (footnotesList) {
          const footnotes = document.querySelectorAll("d-footnote");
          footnotesList.footnotes = footnotes;
        }
      },

      onFrontMatterChanged(event) {
        const data = event.detail;
        mergeFromYMLFrontmatter(frontMatter, data);

        const interstitial = document.querySelector("d-interstitial");
        if (interstitial) {
          if (typeof frontMatter.password !== "undefined") {
            interstitial.password = frontMatter.password;
          } else {
            interstitial.parentElement.removeChild(interstitial);
          }
        }

        const prerendered = document.body.hasAttribute("distill-prerendered");
        if (!prerendered && domContentLoaded()) {
          optionalComponents(document, frontMatter);

          const appendix = document.querySelector("distill-appendix");
          if (appendix) {
            appendix.frontMatter = frontMatter;
          }

          const byline = document.querySelector("d-byline");
          if (byline) {
            byline.frontMatter = frontMatter;
          }

          if (data.katex) {
            DMath.katexOptions = data.katex;
          }
        }
      },

      DOMContentLoaded() {
        if (Controller.loaded) {
          console.warn(
            "Controller received DOMContentLoaded but was already loaded!"
          );
          return;
        } else if (!domContentLoaded()) {
          console.warn(
            "Controller received DOMContentLoaded at document.readyState: " +
              document.readyState +
              "!"
          );
          return;
        } else {
          Controller.loaded = true;
          console.debug("Runlevel 4: Controller running DOMContentLoaded");
        }

        const frontMatterTag = document.querySelector("d-front-matter");
        if (frontMatterTag) {
          const data = parseFrontmatter(frontMatterTag);
          Controller.listeners.onFrontMatterChanged({ detail: data });
        }

        // Resolving "citations" dependency due to initial DOM load
        frontMatter.citations = collect_citations();
        frontMatter.citationsCollected = true;
        for (const waitingCallback of Controller.waitingOn.citations.slice()) {
          waitingCallback();
        }

        if (frontMatter.bibliographyParsed) {
          for (const waitingCallback of Controller.waitingOn.bibliography.slice()) {
            waitingCallback();
          }
        }

        const footnotesList = document.querySelector("d-footnote-list");
        if (footnotesList) {
          const footnotes = document.querySelectorAll("d-footnote");
          footnotesList.footnotes = footnotes;
        }
      }
    } // listeners
  }; // Controller

  var base = "/*\n * Copyright 2018 The Distill Template Authors\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *      http://www.apache.org/licenses/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n */\n\n/* Latin Modern (LaTeX default) font */\n\n@font-face {\n\tfont-family: 'Latin Modern Roman';\n\tfont-weight: normal;\n\tfont-style: normal;\n    src: url(data:application/font-woff2;charset=utf-8;base64,d09GRk9UVE8AANm4AAsAAAABs7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABDRkYgAAAM5AAAsPwAAO7UAmlCx0dQT1MAAMeYAAASHQAAmQrzHJzsR1NVQgAAwlgAAAU/AAALQglW9WFPUy8yAAABaAAAAE8AAABgad+iTWNtYXAAAAT4AAAH1wAAC867/12SaGVhZAAAAQgAAAA0AAAANvDaFZNoaGVhAAABPAAAACEAAAAkCEUGwWhtdHgAAL3gAAAEdwAADNThcVqybWF4cAAAAWAAAAAGAAAABgM1UABuYW1lAAABuAAAAz8AAAZGXR6y4XBvc3QAAAzQAAAAEwAAACD/hQAoeNpjYGRgYGBiZJv5bMajeH6brwzMzC+AIgzHPmeYwOh/Qf/usXaypAO5zAxMIFEAnBgOZXjaY2BkYGBJ/3ePgYF147+gf39YOxmAIsiA2RQAqn4HEAAAAAAAUAADNQAAeNpjYGZSZZzAwMrAw9TFFMHAwOANoRnjGDQYmYB8oBQEKDAwsDMggVDvcD8GBwaF3yzMav/tGE6wpDMqKTAwTgbJMa5nWg3WwgIAz+0LLwB42oVSu24TQRS9GydEIIR4VyBdIQqQ8NhJHCmJO6IEEWwTYgeokMb27AOvd6zdMQ4/wRcgCr6EP6CAio6anpozs5PEIUh45ZlzX+e+hohuBQsUUPn7in+JA7oOqcQLdIl+elyhO/TL40W6Gyx7vERbwX2PL9C14I3Hy/Qi0B5fpxvBlxLjWA6+gS1YvAjpU/DD44BuV448XqArlQ8eV2ij8tHjRbpX+e7xEpnKb48vzOmX6fPiW4+v0v2lyx5fo5tL9RKjBvBv68n7PIliw6v1+toje27yY8F7cjDSs2KUsMyGvCe4LbijZ9Am/EBn3FexTEPWIffUa54WKi84yvV0UjwU3IuTgmc6HzHuXKVKFmrI02yocjax4ieH3R7v6sxwKxmorFBcrTIXSnFszGSrVjPTSOg8qoXwKWpp6VTUbFx193mnV2093d7pdHeEOTIc6pyHysgkLURLmiTjtkamjA/0WGYrdT5Q0TSV+aqo1xvNw2evOs1W29uq3nY+jk8DX6K5BD2XBPtdD2JtBjp7xyuiLhqbzbEcKW1CkSZ92MVKY2N97VyefTcLzCS0o9BuGqcrKNTA2ES2I2ux7bPJ5VCNJYYpjcmT/tS5ZNpgKmi4fa5cf9E2aZrQe8opoYhiMsS0SnV8a/ToBG8CPSaBc48kDWiEqBkVuBPoJGU0dDbr0XZnx3mUvtbnAeQMd58UskhKKYSk3dmD7jXuKRgVKimAI9wamgmkh46xh7jE2Waw5OBlL+eISvGXLn7omGxFlovRUQzE9IQOqQsWpl1Xi+20BYYBrJmLZKriY3xWsrKdh0ENW1TDZ8AboRabPYIcep4COD3DZDXH+arI9xzzsKhFTzHxHUhdnAKxR66O0HGyq9mgjwR8BewtTJPpANaxmzLTCrZxAK8ItaTQ5diQcDtqUBMZn9ErsDdd5Gmcjar+Ffd/j5d+G4nf3XymfXRwVhPDy2AG1vedq9TaBGybsNosI/BZnxBaO6++jxfwbdAGrePN7c9tstxseLJHPbfNf71bGzMAOq73eKrHMeHJ3g300k177DoduVdsnN7WNZ1jyVzN5XbLnUgnZ+6ta//OsjN7stPks9P8A1z2QwQAeNrVlnlwVUUWxr+vL8qWhMWEGwIcbl421rApEJAdQWQVlU1QWQSEsCiCCAqogzAqg6CW1jDWAAk4FKCgIIssAR32TQEJQkjyLgR8N5CwBYSBN+c9FUf/mKkaq6Zquqr7ve66t7vv+U595wfAQribaBChVl1nDM/v5nWdl8U1jMCP7efff99G4D4MQk80RF/UwBN4DH3goD/qoy36YTheRG+MxiikoTmexjA0QQ/Uw1B0wb1ohYGIRzX4UAepaISmaIHWaIcOeACd8RC6oRcewQA8icEYiXSMw7OYgIl4AbWQiNoQjMX9+g0JqIsGaIxmaIk2aI+O6IQH0RXd8TAexeN4CkPwDMZgPJ7D85iEyUhGElJQU+//V3yGA7jBRdxg2mMG/oa3sRCbsQYHcZMxJCvwYQ5hXz7OxVzKbVzBjTxt0kx308Z0wCkEcNQ4pjp28gxbmbI4aZpiAc7r3hnM5TMsDIXJTOP8X4LGHJ7iUWQyj0Wsx5m8wfrh9TZsy1h+gI+wiS43cwursxov8wqvsgTFus9UM4WprMt2bI+XMQ25LOA1XuI5zFUhpzOK0ezFPhzAwVzC5bpnlmluWptuuI5s04h/xDZcNeVxhD24FXtQquzG0DP6bmlkYRpLszwjWYn36LfbrKqn12BNxjOBSUxhbT25PpuxBe9na71re3ZkJz7IruzOnhqnR/iYRqq/xmoQn9QbDOXTGoHRHMNxfJYTOJGTOYUvcTr/xPka81U8wEP8hkd4UmNylh6L9Utv8haDhuYuU9ZEmkomxlQ11Uwz099sNTtNjlXKirAqWJWsBCvZamwtspZFtZFIqSBJkiJ1pYGkSQfpLINkqIyRcfKKvCYz5R15XxZJhiyR5bJSPpG1sk42yBeyWbbK32Wn7Ja9sl8OytdyTI7LCckXV87IWfleiuSiXJar8oNTyYl2qjhxjjg+J9lp5LR0WjltnU5Ob+dRZ5GT6Sx1ljkrnNXxVrwdL/FOvC8+JT41/h1fZV+Mz/bF+cTnS0BCncSEpILkUckfp5w9ZwUqBWoGmgY6eaW8cl6kV9mzvapeTa+u19hr6rX02nodvC5ed6+vN8Ab7I3wRnvjvGmFLIwqrFTSrqRbyZaSkyWnriVeS7u2+GapYFBTyMFClmGE5kFlzYQqmk1xmkNChz4mMpm1WEczLpVpbMlWmm/t2IEPsDMfYjfNiF7szUc1e/pp/gzkE3xKM38YR3IU0zmW4/kcn+ckvsipfDms4EJ+wv08yK95mMdUwQIGVMErms//4G0DU8qUMRGmook2sSZOFexntpgdJtuCdfcdBVOteVaGKhghUZIoyVJHUqWptJeO0k+GSLqMlRnyqvxB5quCC2WxZMpSWSEfyyr5XNbLRtkkWyRLdsgu2SP75IAckm8kW76Tk+KX01Ig5yQgxXJJrkiJU9G5RxWMdao7jirY0ElTBds4HX+l4PKwglV+UjBZFXz7NwrWTvSFFVyZUqAKIhAdSAo094xXRhWs4MWoguLV8lK9+7wWYQUf9Lp5vcIKDlUFx6qCKLy7sGJJ85IOdxRsqAoirCCCu4JZwW9ROngueEPH0+qQMdpt9bka6myt1L2gY1v1vtY6762O2zt4GLPUdV9Rr81U98jAWmzUvhrbsYUGV0Ieh0JcVqczoezQU94NLlAXXHQ7KzgzmB3yx2D3YM9gcXBG8P7bX9xeFnRvfxgsE+wVXB4sUscGIm5v/1fjv3X41ppbR26t/XF2abr/pP+0m+ImuNXcVLeL29Xt7y5z17ub3R3uJTfgFro/uPP89JfOP59flH82/2j+sfyD/gH+gf50f0d/J39r/wL/e/4i/1V/jj/Xf8x/Xv+fdYe7I91Rbro7zJ3jznbf9PcG8vbn54ROzLsUGvPDvpn3oT8yLy0vL+9i/l5da557WNe+z7uVHw3klmiflht3KjM3L7frqbdyCnNeB06UnKgDZN+IezN2buyc2Nmxs+x99m57p73D/sr+0t5qr7PX2p/Zq+2V9nL7I3uJnWEvshfYf7bft9+z0+2KQJWboZMj+kQ8ENGjfBFQfnzIwNVtX/rPRdOqhd/ZzI3/6q09Zp85YA6Z74z/zlqBuWBF4X/UzKfhcZVZo+PnZr2OG82mXz2x5pfn9PfjH/tvdskMj4t/xz1GaZ9s3rgzf/enXf+veYYfsF6IRpBjpmGHMsl5hOpqG840Yspq7Q+wUF24ARaod59hgVLAcSWRtszmMZPKInWO6ZiLTWEqysABRqtfQGvJ4J+YIllrdlaIK5RONvAd5ppuYbpobyaZemyl9DRD+WmzEtQa9aGDjFGGChHUEGWDEEGlKENtU4pawdPciGLmKUWlhTjKvGDqm6lYgZXqYa+qb32KXdit5JDOJ3BdKWK48kOo+kw0s8xsvs4EpYIoE4lsZZgw0XCr0k0PtsZfcNw04Zv4CiW4wO4mgj2xV33wS9OYb/A1LMdWNobHeDOHSaausskEpZJ5zDAT+S09U87UNPFmBAM4xvM8eofALinr5SrlnVNOUfrSyvaUaaiVtJgXcUW5KJMXuJ1zsV6ddwPWIcsM41u4aJWxSlt3ab0ra5WzorTqRSqzNNKqV8eqZsVaKVaiFWOJda/WwoZWfauGFWfV1qpoW47VxPJZDay6VnWrqlXLSrKqWDUxJUx9U/HSPwGJcOtCAHjaY2BmAIP/TQwaDFgAACdbAa0AeNqkuwlcE1cXOHonQxZmICxDWBIyg611FxX3XREF3HABd2UNEFkCIWFfwh4YdmSXTcElKrhbN9S6b61V21rtZ9XaaltbW1t7g0P7vUkCiG2///v/3hNz7zl37pw59+z3ZoIAMw5AEMR28ZIViqjA6HFjR6+QhakjA5WG0bFvFOBNDPImlvNGib6JM2OGWKCHLMx63JmjztyCNwzXecY1K2f3MzYfSQG4e8qWs5YlBjBAAAkYDFzBRDADzAMLwXKwBsiAHChBGsgFJaAG7AcXwUPwG2KBDEKmIT7IGiQQiUYSkTykGTmM3ESeIAzHmjOcM4uziLOSs4oTyIngJHG0nDrODs5BzlnOJc51zh3OF5xvOC85kPNfVIjaohQ6Cp2Azke90EXoCnQtGoTK0HA0ClWiajQX1aK1aCPagu5BD6On0QvoFfQG+h/0B/SNGWZGmNmbOZkNNhtp5mY2xWyG2Ryz+WY+ZmvNAszCzKLN4syyzQrMSswqzWrNdpodMjthds7sutk9s8dmv5j9bgbNus16uFyuiDuEO5HrwfXlBnPjuNncKm4bdw/3ALeLe4N7l/sTj8PDeLY8Kc+VN57nzlvI8+EF8KJ56bwKXhvvBO8871PeA94PvD94DB/w+XwhX8R/jz+G78afwPfge/F9+Kv5wfwYfjJfy6/i7+Af4p/l3+Tf5z/jv+J3C8wEuMBW4CQYLBgpmCSYKfAS+AhWCQIF4YI4QbIgV1AkqBQ0CdoF+wXHBB8JrgpuCb4QPBF8L/hdwJjzzC3N7cxHm7ubrzePMS8wbzJvM9eZHzE/a/6x+Vfmz8xfYQhmjUmwIdgozA1zx1ZgMiwR02K12F7sLHYLe4R9j73CGNwMx3Fb3Bkfgo/GJ+Bz8MX4KjwAD8UjcSWeiGfjJXgtvg3fhXfgx/Cz+DX8Ln4ff4R/h7/AeywsLCgLNwt3ixUWoRbJFoUW9RbbLfZaHLU4a3HV4rbFVxbfWfxk8bslsLSwFFmSloMtR1iOs5xkOcPS3dLLcqmlr+U6S5lljGWqpdaywnKr5U7Lg5anLa9Yfmp53/IbyxeWry3/EpoJMaG10F5ICYcJJwk9hEuFq4UBws1ClTBFmCUsFtYK24T7hUeFp4QfCa8IPxM+EH4n/FX4p5W5lZWVyEpiNchqtNVUq5lWc60WWq20CrKKtUq2yrYqsqqyarBqtdpptc/quNVFq0+svrR6YvWj1a9W0OpPa9SasH7fepK1t/Vaa7l1mnW5dav1AesT1uetb1h/Zv219ffWv1n/aYPZONgMshlpM9XG02a5zXqbcBu1TapNtk2pTYPNDpsDNsdsTtuct7lq85nNY5sfbH6z+dOWb2tt62Q7zHay7UzbebZLbdfaBtiG2cbYJtlm2ObaFtlW2jbYbrfda3vEtsv2su2ntg9sn9r+ZPubbTfBIXDChnAgXIjhxGRiPrGSCCQURBqRR5QSdcR2Yh9xjLhAfEo8IL4lfrND7HA7kd17dmPsJtnNtHO387RbYrfSbq2dv91mO7Vdul2+XbFdpV2T3W67g3Yn7c7ZXbb71O6B3WO7Z3Y/2f1m96eIL7IWOYlcRENFbqLponmiRSI/0SZRmEghShJli4pEdaJ20QHRGdEN0Zeib0W/2SP2QntHe8p+iL2b/Qz7efYL7Zfbr7cPt4+wV9kn22vsafs6+3b7Q/an7c/bX7W/Y/8f+x/s9Q6IA99B6GDvQDoMcXB1mOQwy2GBw1KHVQ6bHIIdwhyiHZQOaockh3QHjUOWQ4FDkUOpQ4VDnUOLw06HvY4pjkWOVY4NgcFqlcw1ODDGBKjixgVGh0XKApXBxj5SFqoyAkp5WLhqriJMES2LCDR16mi527ip403dWFPnZurGBcap2FviIlyjAlXhQYHhqiB5WLBcGRwpC4oMjI6IS4oKUkTGqQKVroGRqiClLN7IgwlgeYhj2ZH5s7TGjh87qbcfZ5jxrxf+bXDs/5o99t8Gp/6v2VP/bXD8/5o9PjhQqYg2XDUB7EqCZdEqV0VkSJwqKVJmQORhysAQmUEW6qjQSFni32m5/a/luv3bct3+13Ld/m25bv9ruW7/tly3/7Xc/gsDBt0mBStikgzmEpwQxf4PjGMXGyJTGrDAGLkqMDIkKDJIGRgcIVMZZr3FjJY1kPyCvz9vATuZlZrJNFg4XqZUyYMDI4MClSHBSkWgykMWqQoMkQdGyVirC5HLQtiPUhYnjzNQ6ocNN8vjghXqaFWIPF6hDGbnKSLZdN+vnxBFdFiIQhUYbNTau1y4jWevRMri4jbLDAy7qgKD+m6bHx0miw6bb/IKWW8Xp5Kzti8LCfWPCPUPZf/7yw1NpKGXG5by9n7DqEKtHDjkGRgVFbjSf2VYNDumVMpU0XKTBFim+kURpg5UBkbLvVg5sD6mHCiyf2h4arg6OixQqY6KDFQbl/YOzhILT4oJZzUWFOntv1Duv1kezYpSqQhind/btCK5qVscGBUUEshGiNBIuTIwkpVYXFRgcK/Z90IsuahApZJVhOHhY90nGqLCpElzowPlBoaj31l9tDpKplT4hCuU0QpD4xMlCwtUvDvHgMapY9iQolD6mPhQ9HYxsuggdWSkTBXDCoMVTUy4IaSwU6OSlPLAEBZQhSvUcYHRIcnsY2JkcYpl4fJl8mVx8hh1UKQ8LlwWEquWRw60zYG40Tpj1QpWk6zFBsaxGoh6F417B2WX3ocbSA2YbaT0T9x0e5ycDbLvEDCOGFE2XhisXckGDXY1slD2Ex0sYwUcoZSFyQ2BVhZiWLOSvePvap/7v6JJ/4WVrBuwyzX4q6mXKePlJvJxbDSOHqiGlfIw1rHliQPHWLXEsP4V5xsuU7GxXil7R3GmgT7VqeQyk2/1hoS/467RsoT+sUhFAhs+WH7+OWKaFxliSlxxwXK5CTNMiAoJjDOagCpB8Q4nLNrHh5/BztSGxq83lZk6v5g4OWvRhkhm0g5L5m08YJEERfQaucGO3nF/tVJhMPAJbuPl0aHyaLkqyaCK8MDIUIMJ9MFGir0OwpJ66zQGbIBqxo17B/l7GJo/EFkwABk/8L7xbgORsQOMoBfsTVxvRyb1ku8lPODpvaBp2ry3d8zrzQZvR9x6U8GAON4Lmropb0emmLrJb0cm94bZAQmtFxwQ0npBU+f+dsS9d9W9kjANTnh7fUKv1b8dmTsgufWCvcIa6CZT/pf/TPm3bDzlf2XjKf+WjfsG5/2v2fPmGguiQGPbCxuqtMC3oGmUtdEgGWv8ge9gpmvGbBH4FjSNhisUEawF913pR01Xjd4U+BacayxnAo3t3Leli4mZv+EDrvez9c+hAbNMDP4NH3D9Lav/MjZgnonpv+Fz+0qHwD5gbj9X/bzMNy2kV6Jvn/f2KSZnDTR1fVWw8aYB8FyDp5tG+6F5xjbYBBvlF2xs573lM/gtOK8/2AT3Qx7G+SHG1qOP5ZA+wCOSzaamoX5ovlFxMmM733ifzNjO/5umZH/D5/9TTbJ/Ds3/m6Zkf8Pn/4uWZP8yNv9vmpL9DZ/fpzBZHzC/Xyayfmh+P6f9/L196ttnmRQnM3XzB+hMNgCebxCYMk7GVq29wHwTZ72tWhktC4kLDk8I9DTON2nY0+RaxtbTKOcwY+s5QC5vQc9gBVvYmXgPGwB79q/obQHqZaRpXFT4W9BrgCzfgl59VW54H+DVJ5DwPsCrr2wP7wO8jWTlxtbbyLXc2Hr3iVzeB3j3kTWuWf4O5t3PsXffo+R9gHe/DuT9kLdJDXJT5/02Jcrfgt4D9CIfAHsbdWFK9wuNI5uN7cKBsXSzcREL30pn81tw0QChRwyAFxvJRBrbxcb7I43t4gFzIgfON+wG2M/ivpVG9gH9I6bVRL6LLu6TfWQfsKR/Qh+w1MhFtLFdauQi2tguHfD86AHw0n4FRPdDS/uIRfcBPkY1K4ytj5Gewtj6/C0MKP6G+/wzBij+OeTztzCg+Bvu8y8hQPEvYz5/CwOKv+E+fRap6AN8+rnq5+XtE97SNVR7pvX1Q8ax/rsHIsYrpsf0Q8axgZQHYMZrJn77IZ+BOyzFQMTHZAoKU+czwLwVA2CfOLYYDzcNvwVXGFulCTbqT2lsVwywB+UAeEWfmJR9wIp+G1H2Qyv6Fq7sA1a8a7bKd9GVxueb3H/lWw3FvQUNxu02boqpm7qy7/a4PsDXyLXK2JomzTV17r69GxFVb+/bVxWp+qKObx8RVT+1/uSn6of67huv6gP8jLavNrZ+fRW0ug/wM/FibP36hKXuA/zeCXnqd7D+ayYK72D913rJDcT8+thX9wF+/Ral7of8+u1V3Q/5DTRW9UDEr99e1f2Q3zu2qn4H8+u3V3U/5DfQWNUDET+T+tWmzs9Q5qgNjZ+JgrFdbeQwwdiufmsQCW/B1X1SSOgDVhv5TDC2a99OTHoLru1bYFIfsNY4O8l0T/96kvqhtUZukoztOiM3ycZ2Xb/VJ/dD6/qIJvcL1XBwMdd0quk22XQ44hqjVMQYd38GwHAmYegNG0tjb9zqGiDjYY4RMBz0GADDntnYG3fUBsh0iGSAjOch/ZQHnngM3Lq+u6HuPzkyPKkfMTytf1vOPrEfNj61DzM9uf/0RT7gQUYOjLHGR6kIC2QDj6kLZeONSm7KzL2iCFEbdk1uY8eNNXXjTALz6L3cP5H1HwOiCI8yHTCz9wUa27nzDW2vjxvBt0eiLNZ/asfCYTJlVKCBkhHrLRJYSGEk5GMkZAqRRrwfMp6jGE9h+hDTrp7FTOcFLOBhPEA0hp7xkz172Qnr7Rf19hG9/eLePrK3X9rbR/f2K3p7ZW8/NzImPNBdpgqcbzpYWGcAVYHerNktCoyJCVyiXqr2iZIb1rMiXOEbqJ4XLjeKc4JJquMXGLuJE9xcx46dMK/vWMLFbezY8aMM7VQXd1cXtg6KYCNrhNyFFZLLQleXJa4uSw27LnZkmCLaJUhmOH5wUYS6+MrWuKjj2NLWJUypUMfEDXd18Q2Xx7kkKJQRLmyvZKUVyNa9LmrD0a2LKlzm4um30tdlARupXRbLWU+Jk7mMHu3iEieTuYSrVDHTxoxRqcNcFcqwMaHsnLgxkaZJcWMM941e4LPUd/Ri73nzl66c76pKVLmEKpQuIawQ5Kwq//Gta//AUgWr70hEYPhCdQ0oArfBPWQk4oUsRoo5YZz/omLUBQ1EI9HbZsPNZph5m90z+4o7lRvJPcaz4S3g3efP5KfzT/C/F1gLnAQTBOmCGnM3c5m52jzVfLd5l/nH5vfNH5n3YAuwFVgqdhm7hY/DJ+Az8Pm4l4WVBWHhYDHIYozFYosWixOWYZYqy2Shs3CQ8LiVn1WA1ZfWH1iPtU60/tUGtcFsHG1G2ky0mWqTaHPCdoKth22Z7UHbV7bdtn8RZgROjCQmEtFEKvGE+M3O1+6A3XG7S3Y37T4VOYv8RXLRXtEh0Reir+3F9oPsR9tPs59tr7JPss+yp+3L7HX2HfZH7U/an7W/aP/A/qU9dOA4vOcw1mGSg6dDrEO9Q6fDFw5PHX526Ha0cBzkOMZxuuNsRw/HVY4bHTMccx1LHbc4HnE86Xje8YrjM8ffHRknJyep0zSneU7+TgqnJKdsJ9qpwmmv0wmnM07nna45PXH6wek3px4xV4yLCfEw8Uyxu3iNeJM4XKwUx4tTxEXicnGVuFHcLv5QfFZ8R3xf/Ej8VPyHBEjMJVYSkWSIxFUyW7JM4ieRSdSSDEmepFBSIamVNEt2SPZKDkqOSU5JrkvuSb6T/O4MnIXOzs4jnMc4j3ee7OzhvNx5k7PcOcZZ5axxznEuc97qvMu5w/moc5fzJefrzp86f+78wPk75xfOUMqRWkptpQ6iFk1TUjVZE68sjZZsCFAGJdZpGurrqhu3aqrTiqnq2uaKbZL6Bm1mNVWRW5SZKNbkZ2bnkgpVQtRmcSI/tyy/rLy0tJxs4u/c3nqomWysrGloEgtFKfVcWrbeX6Wsr0omG2KSKpIlbA2zcg3VkMqlD5w8tq0tNXMrmbKjMWer5EBT6/kuStgd0O0i0vEZTPuD9BW9IYZiXvKZ90ZMH7WBwdrgClJvM0LaY8lnBkEBg0BnyP/2OeRtJUua6S2HxPAufy/94SsStyUeuWC4PgJuFkG7oa8ZS8ZmBIMwNozot5HQHFr+8hMkyCmVojDaT+1PblL7R6+VBPi3HI+hlMfoK53ig/S57cfI4ztOtBySHDuqDmin2gPo5TIxbrvnHgy+dbeNiNMMwggNWIMRczTeUiIbzJfiCR9geLcMPhPBgI+lzELGkxnNTGCCmEDoyoyFC+BCOBKOh5vIwXUippGRTh4zkhF/A+tgDRzyycMn8H0PZguJi7Zm7AlJ8M8NCiQJwZy9gYElaonrggWzKAJY+7fK2uJJwsUlPTVpc7g4slamSyCJX0p8kiMCgsXzfvaFQoj91vVlR1rXmp3kzlXL6aUSZQBdlENFlMbr9ohL6W1bm0nFwcPaJsnzW7fu7U/Zr9xGEXZz93V2ljVK6Aq6pJDU5OdpMsTJtRkNVU0V20jGgwGimMKIVCWZka1SBEsm0C/Ze7SDdxTtqW8jayq37TwkeUIPVVGQ04OL/DzWDieJOVlDFnSdPX5g/7ES6hLvMTSjJ1L4S+//TG4mGTsdd0l9yLmL4k/PXfkSTm9lpmwqJ3OL6NxqSS1d1kTBjfytdIUmp7AwI4cMX8HdFRV02E3CoJPHD5py1v3LGKo6vyvj0+QdObtzdoYKWmKrNm8We6ydNzl6dtmpVeTyc9rrhZ2CqsJsWitJp3OSKGYDP5nOqa4oKq6uIOmS0r1nSbnuethTCTR/8BPkUDi/s7j6Hrldx9OGz6VlEtkcuiScitzOXyTFx2GEBWAXBT/g1uTlblVJEpNSkjJL8rdkUM8Y2+Ki+srSEidmuv3/eYLQdudDuPshcWOwFO+Og3kG+xZqucGT6JIwKnIP/9sSTSi1iM+YMUSWYiGzrgN2wTNw7d7Lf3w3jhnaTK6R7onwOzdMwixlJjFuTCBrUBOY8XDF3Qftl/ZR6tpDwdWSLXRlPQXd+QdLy26Q+AaMmcq0MN7wJDenii4uE7e0lX5I6vjaMHc6RMLYl3AjG/mfVGpiGygYyvzAZVbzl2Kdt+mDkoO3aW0npVPxZ2mrDlLQjw/94MfcK/svle6R4CKG9R5mJGNelQJdbkIXby5uWFrWTeK79zHCEdd/oo8Q7YvXRYQnxcbENsZ0kKWlRaWSFHVMWkSu4CyfGZrBjeJv20Vn1VI1WUXJKWJmJX9a4VpvL8nm2IrGVCq9oaDtmBh+1juz1TizNpNOTBIzcfzgmtAdKlKpO5hzUnL+2P4z2yg3PhxczdXxVdH0lnQqfQvdvFUMd/CvVZ09fFmMJ4xl/XGufo0oEaq5PZCXyKi5bTw4sa5+LxwpaWynC6qolnxaoxL3bOfL6bT3yOBIXsnhX+njkuOvaO1hShfMf4+u20fpt/Ob6brGUrK4egfdJIEj6zczE+so/HLchwFsQRYbuzWms7muqrycLCouLqLp4rR8cUTOvMVLyIwMukArzmEDZPXDLyBG4voy/eDXUlV0oUoyoSRWqitsSFaKMwsL8jLIIUwhg8JWbn5VQWmpuH0/3XRIGhNcVBxFRfJPNtHhdRQc0YMol3F91YoFiyQ47IF2orNRuzNqyM17QioDKwUrq71qL4o72g8/hpyycZHFZFFWNU2LjW71i9Gr8grojHRSm5+Zla8V7JQF0akSRijzWhneoNihpvbE7sy9kybAu2O+EZXT1ekaOiunkPTIDU9SStZldz1Po9IfJF1ft9e3yenF9i+vfCn+keF9zQwlmY/VrKRXGlamji5k4xW7ss7C1qRocS5dkJdOjmW2DIN7uPk1hawp7jhIN7Om+L6WGxVtWtz+hoL0KqostzqqInEik+c4CjZz82ro4lLj3OtSA7nTNdqIGgraMn9w08pKsmsltcXldWXUL7DzV2Y/V1NqHCrZUlVKsfH9q8bTutqOIie8W2Wv4/vFlx6LopgU+Bx6wbmVlWe7vipyYn0hNoKOkYStoEvkLA+HCstVWeKUzMzsHJK5yZzhwttsotk+H4Pz+FAAOdCbaeGWZ21JzxBHhdAJZCS/pONT+gDrE41JDYmq3OSMPNKP+aBUW59dXOj0DNpyt9SUlFaJ4XT7//MEYfdomCaqoitYaedmFpLM+9kuUxlEspRZs88YB1bvuwKRp2OZIc3UGmln6JrTIyWMDzORGc8E4GGHP8rdLfly6392UoxaP160IG4aM4xkraiGt42uaS0hi6t20c2Sb6FZPvMBhb/j46lSWA75/IYjtLyDOhBGR3qJF9LBh2VsChqKwVD7oZgwrZjW1kka6JIWCmYa7Sc/n87IJtfOxfUXYLNIyWOo7MTRzBIJM4Wnd9S/4VZU00UV4oZcVkI9vjyNyeG4Fbu/glMkcByvx6mH4eZo6MJscXIZ3ULqA3k4q6HVSnp3IQVX8h/TushOcmva5ublEjzBtvFNHLHiTW63y2tpVGRhlOQH6ceFzZsTxbna7IJckhnRE8RM0KdzC0sLysvEuy/S7cYQ58kGcUbI2gzhdlHKUD1zmYl6DXTA3r129vPSvFDWojb0dHOzSkoyayV1xRW1rPlM1ZfBaT3l7wwSbnCl/mvuhcajVQclhAXenrwjLCEtMzeXLCwoKKTpgrpS8Z6KO9eukjWs3ZaIK/JK8zRTZjOYz/ZNRzsad7ST+Kh58k3rgjpOf3TkIZxaTuKR23nLsEg8AY7CiHuLMIJz6fz2w4cpwuzIkW0XLokvJn4Ueowkbq/ACLNdQcWr1ooJFzb+joKTmFHMpNo0SEEAKQZw8eDSHYEnJC1X6r6imOldIpwZPBXr2eonnYNx8XvFmjCKvc0CjuaW52uqUyVJ7L+MSs2WHAqOYoRcYfds+IMILmNGw9HMMmY5W7EYexYbDZfDZZAdh8vJYHtmOiNh/6YZeiiB0+E02N8bxkmcoaZiTMt6DLry8TwV3ZhI6UorWxvE7YkNqgR1etSmI2Gnrx2+cGE7CT30s7nX2ruKGiR492r4VARXsETHMbPJHk6jVM/hwRmQhMPgMmqoPYMm+oStI2MSViwfIhnC21BQsZfSH+DvLa44Qb7kXb2l9uiiji7bMnGm2Gi2Cwxm+wY9IGVm8mLpwqQcilH0XGai9Be4rVlaWiVhZm7GerT8GHrDYNaHoXkJNG/ABtMndlD6ziI+zP2Tw00vK8uqklSXVFaz1lDYbckt6rn9iXT/JwbP+ZjW7qfwiVKhju+loT9ki4dNGtqLrMHwmZiwO1TT+rKFbv28JbGl8/mHrbYf3jt8AWIXYOpNYumjbm+Ii6qyi/OyCvNT8si1qRs3LJFkMlIaRlGwHQ6VQnT5IwbxX5mydA11Mtpn1yLJdI+NXlHNye07G5vba/L2biyi9rSdqOuUdH0UNIEiyl3W89mCAF8ycsazuI+/unro1HZq2qUvs3dLIPfIZxhBuzApPDik6uHOTskPZYwkpJhijjAWokUrVszbELzvBEmMnXPuyD04qZyMoxO2RJIlGjpbKxbOkXJx0UQpXlKTWpaXKfiZLWxpKXFhqZR4b5OUzfIiCArcr8+VzJzv9V4B1cp7UnzzxCXJtWvrJhVTQlF11hZNZl5OTi7pudYrxl0yf0nbGV9qa2J8fYRELa2jT8SfoUJvnM7rlHzRpSstp4oKe/z+HMfNYms1WqypyqqqKi6triT1Jd253PItxSXlYvznI0+/qCimC4tJbWFCRqxY0ZLa2thWs4fEoUi6vXsF2r3ZXpfIXx1fpounmDB4B0rhxtY9+/Y8NcR5BmVLrfV0SbAxyreqVeLMgoIcDcnwmJmMCPpxC0ryKkvFNa1bjxYZ4ke4uyFGGEqkJv5HTTkKtiJdzOiYKUweNyEtauMQCWs2aAl3/0fGQom/sSh5R6N4S0lpRTUJ34Oh0I3J5hbnl+RrxRnq5IBCY6a4y2YKIXMvhdWxlusrhfdw/VlNIobDjSKIT33JgPUBKeFhJFzNJwQtuc17c/ZIoNWn39WWa8tyKMIc0Fo6T0tmJaxL8JIQHBC8saJlA5Vdks8md+LAsEw6O4ViTvGT6Oy6ClZipWRD9f5zX0nOtG1MqqQaQotD1orDaZ+4QDIkLjR2o8R9xdlLyRQxZ05hSUlhtWTv1rbt25PbNqeF52ykiBbHibdGQDMo+PVHdo8khKGhbNHapGlVt8GoFujearvzHtx9y2DS6d2Z/1cWvXix3CuYuhC2+NhsCcMbNoyxZ+x/Ggr5D66dPL+Xcj92J/KKyWL/aa7nokXEVmYlA+Ij1Ax/C/Rnq1GzqrZGKMxmVpNCvfaD1lut+vGtjxNsO27534JNt4gp+hAoF/3k97FsJ/kxFCTWeDMCbr1KVh8gYfCRgxgRRVyafsjrnIxcwoCczKaMTyDGTd+2P+2IBOI/voTWFGMLPUWML/OYS2wOPZJ34bz4SPH5HR+SZ3af3topOaRLSmmkLjALRJtpn+iN5Mbo9UkhEqW8YruCzWDwEffgxmL3ILFQ/2tfPMK7A+11SXyftIq9GoqJ7OZya/MKKlIkKdrctDyKCe75IWlNcKpfoVMk/9cSyG/A1irb2kuKqoqKqePQgQtp3llmNLcovzg3Xxy1ko5hLap415mig5L1mzeHrI7CDu3v6NhOHTxYUHCAYmpgjYhR81gFfsnFi+gimkz8KuLLgNtHb++51/SVwDhSnl+aSxbw8vML8gupqInrZy5aJGDTmLZArC3SFheS1xeenLl7kiC/qFRbKinmGbb2FL7xhP/102cOXmhga9hKNmeHqumzMoohoCe3sDivvERcevtyVSV5retIcUuRgPWj6HRaIQlbUlyUxjpeU2GVJl2ckJZhKK8GsYlHr+Lj3WtoHbzZCg/qbCH1EF584f6S+LCbgotET6Z+zqA15IumW9c/Ez8Z8x/G3pQanHmECjp9+/R7irGGX4sWrZvMoCTzASzkGRMCtOYR9150TFpFbWceijxWTx1MMjamnMHa4zI+YfbzEVcvSqi/D6vZ4uUDTRpjw3hIpvJwkY75M5IvNOZLdjNQiOkbebge6G1EeyJ3BbiHeQWkkZDDx3Xwsu6xDk7W4dxIPi56zDjs9CTTed65Y+NS5wi0hYZivzi3spAs5jVom6vLqRM7P2u8IDnzferKFqokqyC1tlBQxmP3ouXlbOVXxq7/1G54shNjigZHvWKKDQ/+f01/cAt02824wcp7UvgfEWxl+J+4+a5L2hRABm1SBc4RMzbfDIdmVw4fubiNjOAz6e9vXJ7sV7wvhjxWuWurLq5enRKVFeJ1LugRFEEhdIYR1JhnoinyEeNJwkGTspG+Fkkl7adPnxKfo0+07CdP7zhQ2yE5vle+aStFCEBNROnijWLhbI/JjDljeWfa53cvPIVmuBJbHj1x5TDxoF+9fofcHx7+QXrAX0UrQtb7hJOM9QPuxt35+7aKr9w4cvvu9dXzyJYekWjunNVTJ867+vDinuuPWN1ZzeTuTDwRtVQsNFQwTCS/Mzqg3U/CYO8NZ0QM8dMwyLv+4b49bZQ3H4cBIki4/cignqFr1ieQ2/lsKWvd2bX9SK68lUwNpjdFbk9tbdi95eBl/5NTGDu2QBExsUwzFHg8p4iPQrFWFAZVS/FUjHDGp2FsOMd1cfxZjRjeikCzm8+eoLC720q0P3TvqvmTVg0iGf6MyPvMvfWsK2epdfqruhM6tjo9DM0WQbNfHhNr5uhlJVg7Rrhocj3pi2EUMQicqdnd3qloVlDEXKCWp/lThPZsDkbwAHvjixeQ+4KozZMSAThUi25mfhLQRX4Y4rN1mWSZT/KmECpgTaant9i7yvPoGnLTwcvJlySXLm/98CB1tKvqk5viyfbLtT7Ra8nwhHB1sCQ4vLUjgYo+rb18UXyx5PKu02RHc0frIcmhDnV4M7VrbYnPcrHQVDbt5u+j634g9+p4OHRn7T8vKsc/M1WQneNNqyWMF+/1Ky4cC8nL516KIW/cA0bIcOeOcVt5mi7Z2lFzuD2pPTy7gC7Ukje2ndt/UfLd0WlTKeLG9LUzfJeQbLjczNVo6II4sZ7PI9yF3Wb1orq69NrMKmYdXOcI18J1VVV1tWl1Tql16emZmcxaZq2j4VJmVXptappTWlpdWlUmXMesY0eZdZmZael1aU71abW1VVXQSIEdrcqsTa+rc8K10i2NdQ0UDlfpd/ZtVnCoK8Yij+DrpM14t4vRvxlXpcqdmSNhnHodp/lb/ovqiElUG2xU8iZqIkeQ42BOb+gQ8eDoHb4M1UC18dgU2yXtucyW6DicKtIN1a9n9//lKWwByW5+mMs9cm4kbJrADyvQzCXjDUcGZ+gjkiNnae1hiEnnNmJP+B46EaPlQa3enCu0fX3z9WPCRSHFq6qrq2q2CKBl0cufoK34/8sBpA6u1ek3/uNo80vsa7dfksnQyMigoI+wKqN09FpNm35sK7vB2sQP8y/5kIIMv5ZuSc1ISsvVkAkbVuevZWuZI6forQcp5gk/IDA3nFzPIzSRfGIOnFbKJTTC7iZ1e/cUXMkrnBrlMjxfoObj+jYmsLXxa7pV76/DmaENUpZ+BH+ctno/pb/I304Xq8hFS8bTESzp5kt0+xmqp54fps0YR0b8iD2hWbt8Qms72BD8eK0Uh85P4dSnr3T4FYx+fOfVj+2sf52X4h15utYD4s6Y5ui4iDT/sc+9IQKF3333KynUxErxNqzHXT9UhKuxQgzX6bk6HP7J3tR97iImS6aepM2t3iRx3xCwREH9zgYK/rInHmopyTyw7wPxA73yaYPTE2C2Di5OwO+XwMGYVjODjOURZw0F2322YCvnBUSGbNgolksNbr9b//OOhN3lO2J24wXYzSYpTmbkJ6UrxaqGhB276pu3k7gYgm0Qe36xa/P6ZlKbX5QvUcbHK5Ut8W1tLS1tj+fcdGPMFzDWjB2ekJmgSU7z83ckyuqSuYdPnd3dJTm0Kzmhg0repUs+JCHmtLVXVrWyBv4Y+lxEqmEjCndBH9FFpnE5X0jTmVsKSYhnHmKE74sZ0cLNsixV8dYksrq4qWq7uDWlLiE5MUPJBhro/I3/bnhrd/tuPI1ObG6mm+rYmvkSq8CGb/RxR/AtO+isnVRWfkpmrDipMnVrLincgxWXFJWUisN6jogYDx70gHFcIQSYfnvfMSn+prYwXv+TTqnr1OHX2b0C+5in+AxtM1ZSfZ9s5xFs8oeAVa4XfDIcwzVFCaWJZYLyxOjKeEl4gSIvvTxe17KrspzNh0VtFc3F+Nf6Vey87s3dctFetS4Sv4k9kuIrDQdyo8jNrHd1PqMPSw4/N5bbm/mj6NoO6jxbPLSrT0tZd0jT6T/Q4Qqo5uLVW2ltI6X/iA95D6qbD38UOX5R+FK3bDKrMIfOFONDZvvM3tyauEvX3LqLrb9piEjx/oioDRtDB0mCXI1Hsnv5P9Dp4RROs4z8/PjQ1d2dmapmMqggV5Ei3tye3rRtW8PuS75H5uIXWuiwGqp1Pl5Dl2TkFtDsrofNM/u4idB3NV9dkLuKTGXLiGp1Kw3N2MpV3aqP1+HdoVXxekRXzxquyCyJLtAks5vnpPg3qQkIzm5AGESL876ER7hFxSU1pWLDfipFm67RktOY81zWqaEz1pqsgw3fnmzFmZFwEs5biuH68YZSHEf1u2GK6P7CGzNmLFw4Y8aNhffv37hxn8SN6WsahtvuPQmDTqpOGg5d5mdXnGItjHx86iVMf4mzYa/LYOhsSXJVh//bBltossZ9Bms802+Nr/T+rwyhplWjo2/Tt2GCTt0Ky1rZoIdvh3vHSvHKivItlTkV2RSenZOTnVWRW0nhusOs6roRVhYzb2H0CVhrKKoEJ2gdTulRPr5AykptXzz0YCWiJ19DP7YXtSc0xyrjE2INDtXe3NJG4gm12OdQIMWrC5vzm/IEuU27slskHcU7y9hl7dkLbffiDF7CRoynuzD824XPNj7zfeb2LRQ+G/ctMXQwzjJ8UgePfozhYcmKhAjJ1xh+CrPtbGPtD/IwnFdaWlJaTJXUcsuK8spyJTh0wnYdaKFwtm7W5hVS2kxubkFZboUET1nLZex5yae5UDpd5MvMYotJfgFe0vElfVBy+Ltes8W14TPYfWXIDOOXC+1sJal3aoWhOjZjQd15KdsVYMdw/TK6TW/XyqrhJqbDW4ub9IOacLZK1+aL8c87zsjOsJLWF8XjlC6ejW3W2B2cd6QoN4FijvITCnMDSbxr16ldXZK7V8YzXDbGavW6eLgkoSXBlnDB36S2xsOkw8GHYVKCLf41dmjHjoM7KchnRa1lwk7A0axV6T9oxdU7b0MBHMyGsl+uthnO9y+fXH/T++GZh8E3cThE+gqvkyJ4HXTFTquO0adh3DHVacIXZ1bpFDvZuli/jiVuu+fe+pPwvZNbb91tw4P3h118/PQuNCOF7CQ4qhV/yerjSqYu/yl8/ylhZ43/LD2EF3Cb+EvonQ0UuzcWMZshl/f8i+OfkfgheDMB0XMPod0yQ9xlHdKUvSfjr5HHr1Hoi5+Jh04Jtufxq1DMaq21hG7B4XCpLX4AihPYnStj2X6XzWFt+DUpxA/hJWx0k+zfvjmK9e57L+7BBb//orPFxarGmF07t7fsYjc3yzRteDyUJeAIuh+gBwF6AKCHOOg5BD0K0N0APY+ixwB6GUGPA/RDgJ4E6AmAnkLQqwjaBcB7ALgDwAdgNgD+AOAADALgfQDmATATgI0AbABgEwAzAJgFwGAAPACQAGAJwAcAzAeAC8AQABYA4AQACQAHgKEAeAJgD4AIgGEAeAGQCgAFwHAAvAEQAjACgIUAjARgEQCjAFgMwGgAlgAgBcAVgKUAjAHABwAxAGYAjAVgGQC2AIwDYDkA5gjgAWAFgAUAbgCsAMAFABSAcADGA7ASgAkA+ALgDIAjAA4AWAOAADARAD8A7AAgAJgEwCoA5gAwGYDVAEwBYA0AUwFYC8A0ANYBMB2A9QDYAOQmitwGYA8AVwAnzBLsBeAq4KjNQRrgzAacDATsA+Aa4GQioBCAMsDJRkAHANcBJxdB2TYfQQrMQCcANwCHRpASM7AfgJsAqQToDYBUAZAJOO4IZy7gsGJsAUAFOMUI0AKOJ+CUIuAAAB8DTjkKcgEIBEgbQL8AIB1wvAEyCnBYAeoACAMgBkEOIZzFAPkQcKoQ9AxAjgNODQJaAXICAdmAsxQgZwBoBshZwKlDkI8AyAKcZQgoB+hZAA4C8AngNKDgEAC3AKcZB4cB+BRw9qDgCAC3AacTAUmAcwABBQAoAHIZRW8CzhEEuQ7QTwCoB2An4BzjcFg1BQAgAyAYoLsA5ySC3AWc0+agCnBYpWwGIBGACAS5j3Au8zmsLvIAhxX+UQDuAM6nKDgGADv/MwR8CMBngPOFGTgOwOeA8xWCPEY4DxGOG0C+4aAsh08RzvcclOXwBYp8Bzi/mHPWAOQ5ADUA+R6AIgAqANAAzlrAWQ+QF4DTg6ClAOwA6G2A/ATALoD8DDh/IchLgJawhsMHJwD4AqB3APIrACcBuAdQAQpOAfAlQC1wcBqA+wB1REAJAFsAyAeAdZkHAO0EqBhBXiGosyXyO0DvAtAAQBNA/kABDQD7xGIAWEWPQgAr/K8AiANACRAGgGSA/MkBW4HhpZYUwOEgIB4AOQAJAMwFQACAGqCuCMcCoGNxjiUC2gH6GQA5gLMRcMYj6AwEsFr7D+AQCIf14llcEAo4IoDuBRzW2oMA+jlAPRDUC0EXIOgiDod1okYAtiEcZ4DeAyADcAIAxx+gSxFQBzisC58D4CFAVyDoKgSwtvE1QNcg4DwAjwC6jg8uAPAYoEEIZwiChliiXyKoDuGMA5xhHFSJc0Yj4CIATwCajoBLAHwDUA0CQgCaxQeXAXgK0EIU/RggrLXnA84sgLA6qkM4UxHOHIA0oJwpgDMZcDwA0szhLABIO4fjBZBdPOQIwlkEkNOAE4hwZAhnCeAEI8h5wPEByBeAswIgXyEcX4A8BJxVgDMDID8AziTAmQg40wFnHeBYczgbAGcQ4MwEnE0AYR2qAEG2AKQaILUA2QaQThQ5BpBTAOkCyAXAOYQgnyHIPQRh174PoGUAYdfeAThPEM5zwPkOQZ4B5EeAjkCQNwDpARwzPscKcJwAR4py3kNQX4TzCcJ5hHDeIOgOBF0I0GUIZySCbAfIOYBcBGgdQFn4EkCrAdoCkE8BWgVQ1h/vALQeoG0A+QWgFQDdCpDXAK0F6DbAsQdoDUBbAccRoFsA2gTAG8CRAJS1qEbAGQxQ1nlZw2gAnDEAnWgwJTM2YInZsEeyYXYKG0OLWcs9wzryr4gjMhyZiCxANiORSDQSgyiRdKQI2Y1cQu4gXyK/c65xfkFt0UazdDON2WGzn8wYbinvfd5cnj8vhbeFt4P3mPeaL+R/yX/C/1nAEYwU+AraBRcFnwmeC343v2R+B3PGxmGLsaXYGiwW2451Ydewb7C/cDEuwxPwUrwWP4pftZhq4W6x1CLAIsiixuJHy5mWGstCS51QJvzIaobVCqtQq1Qr2mqr1W6rn6z+tBZae1h7WvtaR1oXWTda77B+Yv2bjb/NRVt/W7ltBDGUGEfMJrwJX2I98andNLsWu2eiQaIxotmihaI1ojBRkqhUdFL02B6zd7IfaT/NXm6vts+1L7ffZn/I/qL9YwdbB9LB1WG2w3KHEIdKhxaHvQ4nHK45PHK0cJQ6ejgucfRxDHOa7OTh5OsU5KR0SnTKc9ojXiW+IpkoWSi5JfnG2cZ5nnOl8w3pUGmW9BRZQm4l91HRVAz1K/VfF9zFwWWwy1iXcBe1S53LCZcLLjdcfhkkGjRrUPCg/EH7Bn0+6M2gnvcy3nd/3+N9n/fXvP/w/eeDlw1mPlAPCRxSOOTQkK4hd4Y8Hzp76NyhW4Z2Dv18mNWw9cOY4dhwYvjW4SdHfDXit5GSkWdGXhv55cjnI+Eo7ii7UYNGjRs1e9TSUetHhY+KH1U4qm7UiVGPRr0c1TPaejQ1eubotaPDR6tHV43uHH1h9Oejf3Lluzq5DnGd6Oruusk11jXfdavrgTGTxlSNuTZ2yNgxYyvH/jIubpx2XKEb4ebi5uo21u2/493Grxi/ZvzG8bHjC8efH/9g/OsJ5hPemzBpwrIJ8gm7JpybuHvi1YmfTfx+4l+TLCdJJy2fRE/STbo96dlkweRBkxdPDp1cPLl+8o7JByZfnPxg8i9TzKc4T3GbMm/KuinRU7RTmqecmPJ4qmCqdKrb1LCpKVPLp7ZPPT3NYtrCaeumKaf9NV09ffv059NfzUBnSGeMnzF7xqoZQTMSZtTPOD/jx5nLZ3bM4s8aO2verLBZlbOOz/p6tnD24tmrZnfO/no2nDN7TvycrDlFc6rnJs3dMfeae4x7mnup+x/uzLzYefnz9ntkeuR41Huc9/jC48/5DvNnz187P31+5fxT8y8u+HkB44l5OnoO85zgOc/Tx9PfM8Yzx3On5w3Pe57PPPVeFl5DvRZ4rfQK8kr1qvY64nXL67bXXa9fvf7rLfS29ia9R3tP9ZZ5p3rne+/0fub910LzhS4LRy68s8h8kcOioYumLFq6aNmitYudFlct1i0+vPjG4l+W5C35ZcmrJb8vbfVZ7LPWR+6z2+fEMrtlC5adXD5s+fLl2SsEKzau+H5l4MpXvoivpa+L7yjfab7evpG+Kb5P/Lh+dn4T/Fb6xfvl+rX7PV7FWTVo1fpVOaunrs5eM3nN1DUL1/iu2bWmZ61k7fi1K9ZuXjdrXce6/es+Wfd8PXc9tX7e+pANkzZ6bvTe2LHxh41/bLLaNGNTl7+9/3B/H/94/zL/DwNcAjoCHgT+FRQSFBOUFqQNqgzaFXQjuC34dQgW4hjiGjIzZEVIQIgqJDukJmRXyDmZjWy8bJ5MJlPLamQ7ZZdD7UKHh04OXRy6LgwPcwqbGbYi/IPwmeEB4arw2vB94TfCH4f/IefK7eXr5Nvk++Sd8gPybzcHbb4SsSwiOqI8YnvEgYgzEXciHkXoI1uifKI2RsVG5yjEinEKL8V6hVpBK3YqTiuexETH5MZsjTkQczXm6xh9LB5LxbrFescGxCbFbontjD2uTFXSyhrlDuUJ5Q3lfeVz5es4Ks4rbkNcdFxqXGFcddyeuK6463H34r6Ngypc5aQaopqo8lStV0WrslUlqnrVDtUB1VnVLdWPKkZtr3ZRj1UvUq9Sy9QqtUZdrG5Q71IfVp9RX1d/of5G/VLNxHPj7eM94xPjs+JL47fG74y/H9+TUJLQnOiRGJtYnvgmsSfxrySQZJ90P+nPZEGyV/L+5I9TilKuptan7k89l/p56v3Uh2mOaQvTrqZ9nvYiQ5ixMiMsIy/jbsaPGW805prNmgSNVrNFcy2Tn/k4802WV1Z91q6sX7KJ7MHZc7KLs7dlf5R9O/uHHOucyTm1uYLcEbnuuWF5krwhed9rl2k3aZXaLG2Fdpv2iPaK9oH2Ry1TICyQFAwrmFbgVbCqILQgoUBbUFfQVtBZcKcwuFBVWFeoKzxV+HHhIzqCTqNL4V7DLm3neQzRY90j3LCXGHIDQ70x4WppHabXPpXqh+h3eEkNk879gEDui69eoMFSYXc7RKWnpcj5V/pJT1FXKXOmx2EkloZduQ8/eCYl+ADW6LtETenNMRpNfnY2WXi55cO9nYLS0qKiEnFZfkl+1rJlE9c3Ru5ur2tuJmE8M2KYVPhAuvHz6DsBd6JvJn8+7w79+YbPiZG2Ow0vOEbyfyrhEgs9zkiJLcP3SElCw4ViqU7a3QTfkyLQ+Sk6TcosY4aNxPRtO6Qwlt3Vsvv/z28evElM1myWEj9q4jDGn/lgJNbNZTdxOpiQoHeD72Ows40YHyklLLKkBJaOEa+jpcxaw7TDGPG76T2Gs9hBI12t/rEO0c/TP46SdmcZnvoQQ10x5vSfB9iLZ3dINa2HMGKEfo+7tO/sj5gwGyN+mINxhxgIrMVCpEGYTAp130rvtLL7Rg0mhDr9hHjo9xqBi5NYmapYmW7HaqXEkLFTpIRYM0tK/LRmpnTUn87sI5wNjzCd5AoUUmLCUilxbZOU8e7ZZmTuIzgW00/sth4kjcAQF0y4Cet/UzTd8KLoGoxw95YSRfOlhjNVHTyiu204J2lotT3y8MC1srbf2+C1NuLns90R+sEiHX+ElquZXFQcQ0Xyj7clKjPzcgq1lO+ITZ4Bq9LrGQRK/SFfcO7yJ1/cFB9PeeixZK7voMDyeR1u5NgR3E0bY2P8xBP+s/jnR5eO7t1P+ty6lHJS8sW1C4+LKSVvhnbR5k0Sv9VdByKo42cPfXL8/sGbLR1PiwQ9HLhMRHyt8Z42IS6WjHmgvagTf31oT8dlehBNbu+pEa1YtCRHIZmienHuq32d585QrRvqo44uaVJ0rt4fKhDqz+ofxEOrS0ie/hqqv6j/SsR0wglMJzOhWg23QyvYxlhx2VnQ76jyaDb7sSXK9Gfg0S7WvnZLCZfmqubqrXUsHS18Hq+fl4Dc0HNR/QL9ElF1fmVyJckMugmpm9ymLaUVNeJaTX1KTgGdGEsy6NR6OItbn16VnqLJSCfrmVmM9bfc6rQCOleSoklN15Rmb82m4CBvhvLmJmbl52SIaVqxl4Quv6Qys7iptZm1DdU1tWQqnAXtR3G1ZSXaSklDdX0tJTR86w3NW+HXCQ8Nve35NghuQfqW7y3drco24mZAtwx+J4LpzGzoxExkFjEjmPHMemYZJJlZcMOZ6xX118n2cmjR0SCuyqFTyCxeSgGtzaOCJ7nGjZYwCxl7OA56wpXwffgBnAKlcDbDYXLH5Izzpgjlo3C6q56CufxthUUqMpmXUlhUkUtd27i6LkQyeJQrY8vY/uD66tzJXUd2U6urziQekHxT9+oPitk0W0SsBEl0flo8udh/TW6CZJ7PY4hC9NLju3tOpqzspAigqU2ktUliYYRUf1bTeuUIvNQKQw0e6/0QFj8kTkAUG/4zw5sZsCEphYSf8o2e+PwYRoQ+wB6z1n5Nel7vgOp9mGQRTZfl1ZLM8zdzuNX5+dVpEk1Wloam88rSKfj8rzlcTWmppk5SvWVLNcW6GxwpReF4JkrUirGKZpLi9Snb9WkJCIz8GNXPZrJFVbl0ZhE5oyz0w6xOgbaaLu4QwxH83XRXQRWZfnNRe0i1AGL76Ns7xdCLf4du3d5GNjZu2/5pqaCsqLS0XFydTWcMdVszr4BkFvFH0ymxCjItLSZmcb4gJ6cwM7OcriqkjmofxQ8VM+v4y2n5mVAy6uiNbJ2kppKupnp5qojXV/bxBEt6eQoomdTyUgzX8S/S+1bvJ3cFLNoSIcnMpDUmovfz9m/aEiYo0dAF4WJmBD+KXlOcSdZ6X489qBEwmJz2UIgZL/48Wh2nJJOSVHHz8wV5hfn5uWJNFV318mnXnWISLuJ/Tze07yTr6nbsuFYqqKgoqjJIjSk59GbUIQRih1BYyZSIDo14M+rFIUb6Vyp/wFX8kEG0JaI3qYw0+MVfo0YE84VXMUOGiNnNlnxMMJzEjINL4eSfIAUFlHAvhux7CFc/Q70wxu7nYVAAxXugRRXJkqRfQwUcLNULozHmS7OjGPuQOaY46c1GTv8i0fW4w8F9773W15VXVZPFMxRL/TcIcnMLC/ONr7vW3L8P+aTxK+5uRIf0HTOjy9hcdlbzGwabbhKyDzGiIUFKzLkqJQ4GG0wiPP64Dgqe/efZ5GefPPtVdzzB9nwXJHSQ6LIDjwiHR3ofuFr0cFNX1hYy+FjYlvU1AriN/yj/pH/9SkFRfkFRpiQ2IUkR2ZbaUnK06NQL77uMWTn1YeRGPoNmeo0bK16wf31jMkk8f3QgZF92V7qA6eKPL9vQlX5VUFhaWVgq2dHUtGNnfKMyN7hgndvZMdAmm9qkO87/fcvd56/Ea6JEXuu9ZmSShO0jeJQPLZQVI+LEjBssFDFW7fmPm8WXT1x9UEkSgkdCfwxJwdD3MKECQ4xvSKPvG9an3tlt1YYcOd1yGmpPo/qN8YYU6nQIuh5CznePRtmA8rIeY1aZNSfSqWTP97zUa1gdpf+RB+2lBrUg0Ld7tGhvTGNsbEzSZvJgz3pualFRdo2kqqRsaxF1kBkrOop1D6J18IQOHmcT7P2nyjb4fhuxX/+Hfr2oS9pz/Bs2Cf0hJVYYv0aBhY/5P1ZFTILvSzM3jyQnwnIeMdz0dagFD45oW8mQDawFXirG4ISvK9Ok8HPI0zHmUMD/5uTJYyX1dE79TkNtot6KlSTYnoZSTO8XJNVrWQbEOr2adaKzt1F9RKH01NtSRZiG2cLxn9Psnx2qIfiaPzCC0bz9nYPxNw7UwB84/P/7dYPppw2Eg+b//tcNxl82UMR1zb/9uKH/hw1k3w8b+io4eEPftphV6EM9RLsXspGjJrtMU0b2dME6bkU6G/qNwTGrLLcuh9K3MkU97IeblpOXmwUFWEkxXVFL6g1zq8sqy2rEwt6vYuA+naHCgmeeomMw4TmpLeTcgrJbxF39notYWApVCH/hES8WSoU6abOpFhuBCfOlEHlt++iPaTeJNhlGXJiOEY6++l+GYZelb19bWNv71sJ7vS8tDH77zoKH6ZUFOgcTdhhJBT/r+sP7JvEDDF27ECPsut8zG42xCfJ8X/Un1LexRjKw8HvI1n0dcZjwKdZf6t1gS72xbKk3jC317kZLhZDDrga9SeyHlfa+Uv1ffOJWX9En7BNjgqg6pyyjnOxphUV69sOtKa8oqzZ+K6YtoHPSWfEydVxNXnZehjijMq86j5UhO5BTW0yX9OadN8MNbLrshPU7YeZX6Aq2BPvsIHYIY6Vo50ycapESX7GV4qlytiAUSY1lJRuiDBOIXe/Uk7fYWbvYetJg8JewI9+2fAutvyVentVvVEm7P2PmxsMHBk+GDxJYZw5Bu7fC0SKjIzNhPPYCF87m1TfRzexQGsVMuMFWzOxHxUu7hrGJPowXzLhymdkml4cTrmNwGftR8erYWyimELqLjBOWGUkJKzDkNIYOlQpLpYjxxyXoYIMj0jr9ft111u9iPkP1k6uk8WxtDCVSvZMurc329S3Y8JCwZrP7iJ8Zs5mB/uoE8iafeMEMbpDersj1p3rCS1ndQkt2/jXpzxdR+DWTIyqhi5O3kowNtI2Ay+FoMXQ/AN3Zes6GrDW96pxfkps5zpMhlpFrGE4Gg04Wz6xmLD9iuCRjdfnxwipJeWlJBeskLE2YwhI9wnrGlxpo6Qu5JLTymXgjU5LLJkItXdCURP007AJbRMnEzOxQ1jWtGVsy3fgLitzS/PKqbz+BxCWyC3JqIPo16yCf3cbOX73S9lsbnHYVrmgjzpzt9u6O3ih92POfL7CecP0wUTim9+kZKmLA6nmrE7xr4TSSmDMHTr9R23K2a+57xlzHJrqzhqjZtCQe3oSDpCx3Bg2RZzBmL2+fFO6Fe/hs+O1uYla9utV2sPVqq35Xm+35l3BUKzz2MqWV0Gi6IzJFVXS1JqswO7OQ9MsNjAqQbFDuux5HETcBxM4+gnZwpPhvPwrbBEcy4+FCXUf5ll3kqPq6Mc8lxCzNr2w66KIGwV9FMzOYQYNmkufVEaeXSdZEBgTF1CYWFVB+zYzZXZgshrXQ5atnJBEHXkDniUwlxQxmbooS5RH5asma7OP1u1r2HjzXGrjcUNW0GUxgRJsh3zfcQvXbmVUi1t0uqPmysdyd6UHXpksYwXsjGHvG5sUQKPj08NFdrRTjOQ2DZiXcSPhAFJGkUMeRaekRMRsk7kufQj7EP3342YMjE1axxCPp17/GwxPfrf/uE7ZEftbyet3rFc/CHxKjgX68/mPRxeB7zHAGLPFcSBLOc+Tb0rYZXmb+MJCV8FndxfojEojQniEUEaBZlpKUlER6z1OPWSrexE+ic2tq6S2NZAcf2r643dFOEllzdjS3dB4RMy49dazG9Jh+WTzsYI3dvdttPwYxSO837ul6R23b/x/WvgMgqiNo+BCv5CUhhucZufO9h8aCxt5rBHuv2LF3BQSU3g44rr3j7rijI72f2MCOBUtsEcWWWBJLgiXGJMZE9p2L+f7dd4CY+rcQ4e7tzOzuvN3Z2dmZWUd7CdrZBRYQO4m2TmQ22tj5on3d8VFotnSoIFiKrEU7ObdlWCsJ1BMOXxGOnBrMkHannL4lrlPk0CEUeWMaJmtXgZoVIwNaDkq1N+c1qUEmg56lzfqUBItZsoUdNdWDVsY1h/5cvwsk2FtVB1oTYNwTRy7U1n4uUqSvICkCPB5teUQ2cEtDqLeatc2X96OOVMfEaGj4wx9jhKooVsWidSLdmJxsoMEPr8cITWmsicWn8k62dexRwuEp0bbDQCRV2xDOv9WidV9WSL5eQ5ADzRRpZbH2AZyRHOz9hEU/bcXcUjA6n6imjnkhCRVKZKDaQS/q2O8//c4+Jl9z8+KoKMohlXLsxCtsP1HklKUEeQB2G0bACeKBSyaOGaI+coImPwAPxOS+JOo2q+nPIMV3FNsX9Dx9sORCKd1PTLqjVQzSRQ74t7ToTay/GD3QBdkGWx2ybUscbb44tMN7tc5fDkUGf+qELtd/myxOE4+jO6Y2BMG5XIIwPp01srLSM2whH90xAXtnkwj4Uja7FknKiIbXwhCzSZMm355gSjcxYCv3IH1PcekVvQsa+clBXB9UFxfp+KfAqz26lG0hslitWq2gu0ALbA12COPTcE1FFWzW28Cri8Z47zQGdIZAGJmYoEqTpxn5IKNPwO2k/O0HalAtFRQfqLLw/yFQZej/t0CVoS0CVZzOUw5ZNg/HYZTTcoorZK0sdl9lrc6pnJ7UcGntrGJy1rzQhNJtDJQBj7K9e48WFLlYd+/LOII9eLX+PujF+MxP0EchRpCuuVpLVLgsPCZKFU9PHzXqhTA2mU1IlGVkJOXoaTLNKoYCjTDIy262uKrXzTzC/AylXjNZrdccl9lLZmmD5N7ihCKrvkj+LBNt+wMNyrQMWV5p+fnr9NfdhBZFWni8LDY2wk9HkxpvMRAYhMUVOm0Zg9dlcP+hYx/KyUI5Z98nDw2myFszKadHaH/D6R090KBvjdZB7j3H6WiqfkBwK6IJ7i5SSEx5DsBQw6Kfth1sEttH0t0bds6dtXytWkXv8Z1r8pP3hJIFUMBA0UjvOysosA47eSItV2yFBNJy66qOHGrUcmF0qTRcExy1RRavDyiOpTVRbGy0DIrhRiAUP/92/6WjJSEs2u/cRLWST8rzHF7VgPX4/7ZOtkNYu3EUr9F0ihOCjsQZasCc1RGh9K5tK3MWyXvB9xZCBxMB+osPm6NWMTC/moCHbHLpGm3s1mBZYGp4lopGsnkTqueX7yrOFuxSbSnGFb0keOrkz3b6f4jXxwu/IcbPC/RZx+wLmpuySt4diua7Isrr4S1E84StuzRG6x+7SRaRGJYXR2sUbJRCBkU8ZXLZ82/2X96+UxNeRINsGAlckaDcTXHVuDt1u7HlC3RBbCRPcQX23kDnWGG4TqtjZahLZMMZqjd8H3WEbmJli+4gAfKSIJ/bMRvb2Qk6zP20me98Czdx7nbPD7IN7/tBrtlNbSauBYEhXSkwAuzuSiwj7gWBWZ1xUO4X3PD+xGbi2F4g60odoJyWEVfRR77oEOXEF1zFBV6gI8ZDhVcbC/knV4ljwI0CN+vJCFfiAEXG9vjjmBtRQ11FT3fc+q4+DVvuhq1APXPHMd6urpMpcqL7eOoQhdb7Hm9uu7Woe+k+aWQQ/PwHhSk2WZvqkqfenpMnT02OUxuZd5v1b4A8uR8xuQWgkyvF4/3YiMc/4QHGhCGA7YDoaAcYc8hwqNnO6F/dHJHujloboxhPkU4ImwffTJwPAi7jCJA3G3GjLgiM42k/5KZ4Es1lIxe8UwYOTMKcRIW1uLAvtR4Ud7VD1CIIJ8Edgn9ylccPdm7kJpiMYcnYQX+IMUcxvWDnf+MpXxFi66A3n7m1aMwEe1UufFUPwKEJ9rJn9racAiWYSwjgWWNb+Cc8iEcYZW9ECTB2tAN5/BenPkIUePB3zPEs/xk648/8UJyBhmIbMKYnonoffeMZdRrs7okqrnzmDAJ4z+6nrgTZwR94jUZQwOEZqtf4/JvnY3HVQe9WrcRVvy/oyDnMpq4SPAf9ELLm3pstmHdv2TZK0cw2nG5gvADhxQqiGj5xa3lk8Atu1JBg50sE+aR6MtrzCYA7yOxK/Dkw7STRMjJt6P/3yDTTpH+PTNNN+s/ItDZ/E5lGOihAN6648VUgqfAzmOrRUiiowb5p6E2g72vReyJBLR4iN9A3vtTKdXVtNM9vJs5ZP6XQXmg9cPfBb6mjtXl0BDfa6z0Qn1WIzRKk7/7qQ+ENgq13sAN3Evui5UiTVOY4Aw2pY8LtJ5JOnpKdij0ZdoIG6LvFYDInydIjk6OQ4O6wKORQwAHvvS4mdbwhnrcAqBLUCRqmdH3+mu2rGhbA4e3jNCplrCzWpLRoaA49CFu1bY3vehetRqtWIZUvMdFgMtLWvYUHsg+BDovap6nSk9NlcCgIky6KWxThRTd0RmxB/4QZXpZFi2RoqwVDeHdS8BCGSpOVqZokWp0CafAm+IRQY1ElWWTGBKPeSFtygASc2X4o+1DGIRc92jEbZCnKZAXNqlmtjo7QxPupIiANG9pvnSbUxCgVMbLYxBhDHA0GNQwXhiSaN+egLXZyMtOiRiswSpPjk9VJNNJ4hgst6rh9wXI7vTitMi5WphXro83RJgXo3zCwvSEuMSZWhuOQ1HRcMBzaMFaoVWni41Gv6QRRqt6Uaky25LYHNPij4KLQkGxOwQHTsdhdcWgChVX/KpBa5bgeKQAfU8CFIgcpuOA66emAueLZAfGKTepDJhp4ifezFev30BVrFmUukQ+b4DX53ZG7q/hoyg750TNr+jPrxAs14zXTfCTkRYH7xoAFy2ULiYTA5G2Z4ZLFPgvn4WCrvdZdBQyahWpLsjblbdgtPyWdvAnwIeH8A4XTj5AjnwK/+WhwfYOf7bh1CHuk+uARFrCiWQhgGRiLZCD5oULDfTif8iZ+J3jkIQh5FGEGIdI8Y1hOoJyURMfEqdUM7ALbpQeBz39IMSUlJ6S6oBXmm5+JltT90pqpSxB1hQlTX4Gov0OuleAf6KFtQFilI+e9W1opHhIybpHXBIltm7h4Nesne7NN7FU77tiQbMlqMRD6f9cvD4rygOi7R0BYJHECH1Gk++tx6P1nRSRE0+SeN2r99uTs3Mxsl/3HrF8mX5KsFgV3nT2iz7wYlUIdE58cn6JOVj2Z98WInK6SSlH03aUPZh2VkO7xiSqT0ighXW1qvTA1IyGL4Un3fT0WkY5JVBhjTH1Ozr4b/ALRSx1xePDZxYnxJpVZjVDfqHXC6AhtKHo/oRnaVJqstql1YTEhQeEhLisXeU+NmYIqynnxxd0nJ5NNKcbkRElzd7mRqL9QWDTwUSAQBULRwH5Q6I/6eT/72rEjtRLUdb9KtliGWHFkwrVF90Mw5pkgbgxa9gKq14JFZBtuAugvzQk0R5rpNVl+ab5ZvkkuCeLSpNKs4rSKrPbp5jxzjiwDB7tER8cpaNeRwixDdkIWTa6wPBbqE/WJ+PgiK4zWiiKiosMZss3cjHmeMtc7SDGOTo2UhysiI4Ny4jOUTEVocVRpaGmsi1bsG+sb6he1JrR9hDI4PkgWmRKZmZ6aakmh6+8Iydx5EXPmycLTojPQXMpIzkxL1KEfJu6xUJulyc6S1Y8UxqWkRqfLyTYZaWkZWAepRMtkFwIsAmF43QSt8FcKic4XnGtH6k/heg7PJz2vxSF7Xf8pZG9VmShJmRhHk4filPGxjA+s8i4Qvw2xA1U+ojiz0kKTSovZbGHKxOSFy6K/hPeRQfGgYqeID+uDC6GbFDo0xfuRT8+JgF/DBnuoH3lzA6g5KuJD/KAf7CWd2RT6JybPAwdRy/MuZV7J/tz9h/JU+zfl8QdfJ2uA9B7Ztfbds6/R4iffCQ0GvdEoS4pPjFVrdBoNPW6SkHRw/01MChSws0JI3nZD2x2LcjEzQTxmvFCDpLZahvtlNCYkJNDVx4QNoQeJu2jlljwkgBsBZGgR6Wyb0J1wYpGi3Z1y6DaD/7wB9CEcusFIL4rlMvjndiBuN1/AZXhRTUdo4EcpR4jT2ezgYDYkkm4gxLFI6CYnJybRDWdao6KkmMSYmJj4WFy0E585fwf2OQAt2HeVcrpAgLYU51dGXvrrsRDZF35ic+pKlBMnCf54iHz8p/Mhsr0XV9m/0TfBNtyTYOuo7vgvIisl/pnsezbBbETWrg7+E+kQ7jQm9PbUagH4FPYA7mHM2DDiyLycecwhMeiZ/Ai4AEfZO0dY733b59dwemgj1GkxkKSWAkGSzOm/msVlLvjfaFafSZhv1a+cT78E0+rB9DLyxt+Qc4Obua/cELmXrxCtG/UZT8hnfybWFhJcqBuRjqBwfa3Lqp8sKyOf1VIxrCZWq47X0n18p0WtlXO9xDm6Y6oybwnZsEoT7xMl888KLinK2V5WM26vh4FOE1vizbE4pIKORIIrelgX+J4Mfvh9z/oYOliMx19SotlCZ4uBc2IZECXL4Iyu0oVpM6qBDO3YLhw/lkI7vR5na2/1rvS2OoCyl20fvP4ARElTNObYENOaYDXdNagfTkQybnJ5tRcz51JY3QPZFfM163n67r6H5x7LQZtvIAEFaYzCEB+aK09PSExmgFls1iUpIrxGKjV0dLIiLTpZsnPl/Ox5cjgdDuNzF80B3eEYsBTIQeuXgE5j9CbWaJK96Q2eSs96HZ9Mx4pmK1ctnS2beXDhFTpJ9IV5/5EvZKt10rWbN63Z4Fu0V0mbxXt27Ny7u9R/rZnGho23XjJ4KPIf+CEEtpah/x3/Ib+K2tbLIGpKrOJOrd+1uKqvwcUixvMciys6VgzHK2B32AculMEloAfsBcYp0NNm1lrEoL/pGegARDK4G/pLR6bCzheARQaSQefzd1JpJ1aL9g6reLeX0Wwlt6QSCCod0IdfKh2nU7D3TCnqujKe1cTTo1Szls2Ub4KCLDAUDKvP3nnu6KLhKYxSz2otcgubkMKAT8RJrDFeq2WVanrLamF2sG/JAnnn/gNgayiqG/iy7uStL7HLwslKcKmSrXQGvdBv8CX6RVa8jcX0+Kp9cXnmgSOyI+EHtuykb958JybTw6N98caV273kXivC/DYx7l+9E5t506O938awFV4yr+0rijfRHu7vxGjevNneb+eBsCPyIwe2F5czX3k0xmqOANHSQRPGD6LJaYPGX3348Cr6VzseH5rNgguCONtlEI/UuKGXV6Cfth24T7gxT4gcfUnKJYlpT+KePTILW75pI7s5dkPSbONW2rzUsFnve5DSBmiCVQGSyLFs3HwZ/CwFjkzqSUfq9fEp8lTWlJbAJB4zVCcclxgvml7+KDvJmiOv0ap8Ta62+CmFa54WBObXcC6Xwfy3lTuhyv2fEGXmnYZ0SWK5ubJEZmZ3bIzZplkfbPQ1b6DNq0xb9P4HKZ2PcqMmUhK/Sbl6i2xDnjqlzFiYnqMuVe6ilftUJbqip1TDktbbozODgsM0cd60f5xSG6hNKDEWmPdLUk6z+SbZrkCjwkcdEOlrWZG4Ee1uTN4JPtsSNPrVKZKkzWGsUh4QGxwVkRxaUFCQaExhKpLN+u0J2i3qrcqVEsVcdpuqud7SuAPxO2lNisqqLcvXGnSVCklseRZrkhckZ6ElnesGE5q8B+4jPacNTJBWdn/d86dKmPFHhBi0qZQOed3zvqgF4AcYEOxBgK8jYHqjKwHwbwJkudIXSKRxOT0prhNaje5WNrl0gA/a5RFONtNpCoiJmxR5eRbS2qALlz6b+J44GgS63FmJzweR0MuuIVe6HyJIczU+/RdcoMi9itUEmA8OSatCrT7+kcHBNNI6QtKCi1NSjBYLrZ8ZtGzTeolardNpZCqjxph09uxD2mkr9T3xuKzOTvX3e7dryE3uXMENiptzu2wUmjFkVjU+UNwEB/mAQbDXv0SUN7ZCsBp34AjlDOiHh+o7Y48FMgh1QwPDG4Ld8GFaB+I3or7+RA3ZH3dgujvqgCtGXYRQSYViccMmBPY+16MSLKp0OIp/O4I73D7prekXRn8+ffrnoy9Mv/X1hQtf06vbzVu+fJ7n8oMnTx08eOrkweWe2KjHfm1rG+xwxBbkaCuySFnWoEIbqce24cI0pdYUJg/TqqKUDHz8ZrhQFctqWFlcIptJ26aIMhNZCwPbX5E27BaBfG6PEImCGZVcRaXDbfwb7Vi5c/yRQrxKq9bQvXsLqzzHlo6SQ3fIoB/3kaXjqjyZ3r2Eao1WhbdfiaYEo4H+4alwycnrvnfkwB2tcAxwv+N7ffEp5ulTodGQYEqUzYA1UtgDfoh+ekycXrjPi+acOWfhPq/C6RNlvcAqaYNzAylcVRVw/ooM9AAfop8ely8ErK6i/+zRyHInwWfEOnyImRdkiw12fgja3AFtYGvQhnzKzcIHInHNO1O0TsZplDEh7eGXbz4UxoWF+ofLFOaYNFovStEbk0xJV8Gn7YEMFJ4B79UAmdCclpaTIoNR86Ubff02rttaXmYtKCwz0qAnBZY3vOCf0mSb5gIGFSAGVr66X3n/lQOoe9X2gW0tMGQQcAfo50vAy60PIAVoaBBgjoBHR7yqABPsDGcfBoU7TtfMOLzy8PKDbA27AxQeJtsIbOOASfrTZPAebIVU/bYqtU4l7xI9u5ObrFsNFP8OWl8Gopd0Q0E7BPvLZCDuRJPrBWqVTi3vFDXDrbOs+yVIAEfQ+gJ4/ycaMaROatFZdGaaFLjG3dfd196XHBTrngvJ9wTfmu6bv6X1Rl5bVRmVenqlCOmoGg2r0zBqrUajksWLSQdBrD5WH4fxzZ8bR38uU8E8oWaxavFiWZSYVLgnqIxak05CPtbvF6WaDNsZ2Bc8kapZvEUfG7+pfzd5v5XffXNjx4+/fH9i2DCGS1ZJPTb06jFw2dcP49DSfPfo94/vVI/rjl1/4GAr+OQB5YxkQQSaRIrODSofpILjxx/YPYD6K/AkUrw7iQR3GkIxnE/Zd2VsGWcscyZrOe0uaal4ktJ8mOFG3iz1AG3EkIoR+ohrLMqljDfs5Qt6wS7inVtWFS6Uw9bdesOP4IdPewGHcwfKywqYaWLgukaKo1DphqkirDThVZzhpor4nQd0BYOlYaw2Jpxe6rsiaJV85YbC3YFMQIXmZIVsV8KZkgN0ac7uHcfl5ZURK8uY5HBWGyYjXfFhYxUQEtixguWqXjnAM/WOcBH/FXo1fYXd3Ah1o6PDWoKsHYF9KhxWP3lS48h7UzgtJ77DVrvPKOhiA12JLbw9awCh4Xr3J5YTNTiOEZV98LpHd+xOhO3JA4h8bkp3jHkLW15R6fu2H2YjTKzGDiAKuc89iRZlt96WACvSjviiWjuastGsy0PUDiC+sX+1jaoh/CieAnAmyGi/ToQdGNtpsWGXm4VEYWNKIF55Ri0noxSf2qsgYwS8NbdlA5UT7JW4DCAKQPkEe9mz5lbw5lse4BluBf+VB8Gm2xiC/PVBJ2zntQPzltotzYZdew7K7z8lyA7f2Mt4ns7AxN1sup4IFFtrBxAqUNATlZ1+to9ai0214wrBZ4WGQvJ3TPx9AbxjKxyNgLHRtuSePxJNihryB0S2HRwBXs1GmLdfYXa8qkbghAD62E64oU69fIU7/wzBtfUAv7s1Mg8DRmLAWASIB0FLlmGEMISg9Gj4FLOJHwH9+A4utVk8mgfBFFA6DVX7Mw5IRZ3xeN0eMwmbNAcQPpzMlbL1Z3Eg7CP009YPeFb7EmBhu8X41wFE9msr4hxQoEZIBP1tGh/ct47WRn49R/W3OQke+VCvI4Alz4F9He74OhxYpHl/hAeKsWUEP+TU+EQcPWxQB+LT28An4x9Q6qJ9FNfuV7K9bSlOHzcHOgEPOGH0pA2ey2hywxWxNiJSF/E22PlteoUfCZxZoeIOzgFh9ReP1KTsZrgYMZl0ae/VA3fl4NNTaEUaBqUs7DFlKWMWFwblBjRlUQB9vgDTwUS0dBig91XQFYgI7Az1pLaqlnTmltZKwdR3Egg2O+5sGE2QKb9dO/3lxZR5c2ioFHdnoXjJBjpLF5ERKg+OCA8JzojIAUQ56AZoxukhhTMagL5V/nXkKHctRXYRzCJEpLsC9ELSyX0j1ZgYzR42jp+34ZVKHEPd9HpJityoqKWwTV0bH6elO2/ox8bIF60u27ON8alia3bLwA4R+do9Fw0BxUukJ7l/l1/+IFM2GbhIYYwIdE+8X7hT/jIZytcwb50J0YdyNFzRmAWL6xxtrjgvQ25TXoaGc6It9nyLTGbxKdBLDqSiIwnKTQxU9hP3UFgfMgEwq1D0IGXHc/oRzBFt0iq9aOgigu7bboDeAUyAaD9MEfIOizUg9p4jNwD4ScHHfV5CCfx4Xg+3IAObR6NWr2cn+yyh121b7bNIHtOPfbmBsWi1ibFyVZw2JuQQdAROQPz7cyBjhuzAXalIBvKXO+8HwO6JaE0YGlMI7uWCS/kOJS+5Yc8cbXLwoTRRaVJHRK6PiKA95/RTjJH3G/PFrdWMz7m42hoZpxGlJ5hTn2x9NeESc2z+uIKxcjgLdoJD4Vw4GhDwc7AigkkXPQcfb/+xmjGYTOZEWU+glTYMEwEXwxkwEQySX/9ixYRypnS6ZfzEf3Cr20rxyVL65DmU3Acl9x25zSBWeoy9M/sXet3FBSdm7v36YPvw4r7zlxQtyJ6f6hLnfyC6MmT3VpcxKzP8Hh67Nrd6dGF/lwr/VTuRdinq1BW6wI9/cQNOV0/uLC5haq+wtcdlQ7ZK4TxIKENWrso75Ef7H9Se3Ss7ZDhVdog+ULY/Y4f8q4v94If4ZZ9GIu0zqrPtFBZxvA2uH1XJte1IxRI2cWAZyCz7tgxklDmA1r+Chb86cle4PVLQR8xn9dKINBqdVsesWSks8VmzfYV8+JgVUxcyK+cFTFVMkiz6jToq0kXqIqNkkfpIfRTt9Rt1QpQysXDq/nmSacdvLP9GfqBie0kZU7FSqNUbdAa5wZ79q4l8jEilRroJMyZuwbRx8mkL9p3czHgfjz6jPicBSb9SME2k26ffJwT70eeDIuPZ1C+sxyXVO07suyi/dmK6h4VR6Y1qkzzZThV71aA9YFHwC+xUM9eXaOBa61LWcrOEGTqdJVoeo1GFoa40eAk3FYcWFRVnldP/7YxaxSmzCRb4ZRNHKWznGlxHPu5Nke3hKpuwKxFJ3EZy9QlFthZwoZybG0U6CkbYQvsTNiFr5f7Ajoo7i8kH3B27u2zW9xRpqkfaCe8uyxWLyYW84fGlCHyaOwvKMxmno9Q+4Ebx3q2NFc2zDUVrcyRxCa3U79Y0z5aMSlC7pMRbcE8OzEbtQgvUuHegXRfYtJ7EX4DNC/4emHs1qTkuyNnenM8RSvX/l9Cgo5Td9DWxHrSvI58hum3hAa7GDdH96VUaMaZ+H5Dg5tSjhUbxTs5y16ac5e7v5Cz/td3/a87ymP+LnOXj/i1nuUerv+YsJ1tJ4Ge20W7EXYq9zta0dagmP6suIcip1XxI1AmKTK7eQQEZ1XhQPAt7AHPVuUFccLADKEuWbqDAiHYbsAuV/Rk3G6ik6wk4ot16wolzaQn49quVh3H6mgJkGWjzgOCGvizrfKsH9Tk8gX939nnZMHQ8ATLACZgxkkBjQiyFJwAJTqBtfDVrZcsAzEPb4ssEGdjsJDzz17Iu4BMRuZjfEI/yud2w1J66lCxIJbBTqy2WN0Z/YxeO9ykkGcnP+xBoAM3F5mmkttuL+bQliPSglv7HI6agkZYyFcH9RKDNv12wko8Rens45xZxkrqJ1cBKgrzaEut7hPVBok2/gPiJqEYqmQarZKo68geE166hI9bFTlLVz/AiPw8XLa8laxUtCdQppuDjc6QylY+mgJBqbPqP9T/WkWGIiBLu4xWv6hqk0vGe08frj9eSG1vSCJyCfRXQKEcqfBboSznAXrZ2rtgNoPQFARJtn42g7CYPFn/MofgT9n0Ueb4HQfaNwAq7mvqRwtp9s6d1JnYXyKEuYg+TDnV2SC2vvqupr/HDlsD7eSN/DmVnmx1Yh7V5NfWMeAfyILay/wnw1t+A8RZQvqEzmho61AdrwWrqEX7m/A54Orbk5GA2lzxPqUt7Tt5C8APhGsx9NarsmXPC89Qaw/NmDBl0W4fpVz+7xzsbNKKdRWijMFpTQrYwEIZ5gyh8zcM1kskTIDonBYgQrcCUdGBrV9Srr145A7K+e2O/3LBiDd5gQwz/cAN6aHLD7xJYa4hsynt/s3/7HERu0wjCk3sB5AT5wcbgLQF++f5lO3NKChlS+SYOO6r/6a0NxRr2X97aUjx3c6gfQbe3/PXE+raauoOftYRV4CFiuxuYh9TN5sxOaM4I6uY2edfPdO1BcEt5B/s27o0e9gIFdrFnyI8F2M0eCUWF3c9euULJz7CVeWBqNgU+eOX8Vf24mvInJ+on1ZCvFWAK90LaC3X9TacpBNx4TGoVk4GCyWpTxXfUCAJswhvOHOrGfYqsRY12LcWKPmJ8Nyv/pktRo8+jRre5gYMnX0cEXJlyFLy5suCo8+H9tkv7yQ3cQuApHbBw3Odu8gGeT54/Ov3tg+unxs04wnCJq6VkUt+5wwaP9bx23ote/KXw++PXbv0s//5Un8+Y/e3Ax0NAa/h+pxFj+s2mA0uF5IavZ40431MOPxwMRThC7T5sDd7//e6NR18web5CUjn67N0Zz5DG9wCIAIl9h8F+vGERcunSYwGX3TJovUFYHpgVFBQUuonWiAdFT1k8QdbkM1wQUrheTedXHM0+YC5tGNhet0q4VRytT2IN8lQ2MYvJFO9jgeDl93RWZnnJBdlQs3SGIiIiiI4MVoTEBmcBS/v94ezyNTIn8AbnnOIKjrCIY9XgIRRL46nMrOyM3BTJnv06bT7emZAD91PkwEIK6Si1BCe0ohH34SvMT2MNeQ9M5hqkOwJyt3gH+vn75flbSwpzd9DX32zJb6TzTNPeKra/ILKuDA/ApsgMNG9AF8I+ujKwiodelATvYd8ZX2dxJOkuNLOxmYB8bI+6aP+zzduTOMfL0mjK8MsC4q8Q3C2sBbSIy+BDdPF+hhw6HGsD/xKl+5liKxL3AnugLg7bsDbOmtV1OHrjtDdFdo6lyE5RBPmFL1ZGeOkHWtknl70DzZEcZ5oiOcj2oL3tf7oStims9YCVA8EOO2zvOdq6t7OKR2sS90Qz0MvmIMyOj09QyMO16jAVAz0bngh9YoLXjJd7i58agDCTmKffVlwgM7EGUzoNenDrQP8GhdAUyapZmc8s1p/PsXwN51iuI4AKW5q9G0NOcKPbNmW/JImmbG+oCzW+1Bw0rd7am/v+p7kZWJGOuKLZkI07rG/ucFJTh0F/jpOSkreEV/wn4X+Pih7ki19cU1z0wGbGVvOR0ajH773CQaQEGFafUkh+gTDbI8y2CPNHXyqO64mFJtrz7H0FwhqbfaKeTGtu+PPmhntyrRDsRwQeLqvrIurB3EJybQtyG1FDYtEI4sXwESSE7RLYs5nUmua2aarwiopo3UANs1NapcDvQoBoOQsQsUcKXxwz3g0JNlIisLyW+1B2ojesjYK9mex3TWQRUSzkle8KeQkgXnf1oVg42OowAQ7GAeIbKvyL/CucLxSBsVcnXk0qAoeK2j4gnzwnLkSfizlPgy5lsIdIeUwI+pXBASLyqS5Fl5JaSjEkiNYr9AoadvUB3UXmRULY1wcMFllWJC03rkgi0GS6W+lgG4Xt6aCXFMwXY5M6/UYown5dgCAY7lc4RoQ+4Mijxs2KKZLiNoq/P1R1kGaz2Awl2qTYhKcp5yN1LOIyqUFcmWX3UzguRtvVTsFFcAB0FoJ5zbkJyadRxFQKbhf3H5cXcPmkEPrbExQ7gTqcOc4ZMDVkX1DBDZGG505ZIgSnGgOpoFncd2Jm8FenhTCqOfX4LmzZeRtM/5ZrLH44AT/jNLsPg8eH9cHOow6DYTvYHScOrz2MRtCiw6SHgLsJjFIg7v0LfG/V5qjAdTTZSaDTarQauUplMqiZ7C2rUzfIyTvVKpVOJe8Y1X8EdJJByVM3QFTuSMvbQ+sTDAkGuTk/ND6DiS0oUhXJgeTRS9CagTboJlX4+Mdslvfz+PL3R+fv/LqjKC7KyqxfGTJ/nmx+zoJdK2nwJXCT9prs3n2zf3KKD71rf86JatnJkOr1++k0a5Flh/x5jUdPBoa0WxS8etN6mhQp1lvDqo7IjmXvK99F60U712evWixzet0d6xauJUBRPxxHhZFBcyhS2dAadsMDTPPOAHOy3XxhD7ubVj+Mj72bnUvxRqW5iVjHDMdD3bYuKI/745LzmZc3S8GiUnXp0ZfkONtwLlu6CQwWwoEiUhKoYYMYsn68dUD+VDp3dslIdxkcCFtN7PtZx+ug71fFX5d+S2fs3/GoVparYbfRaGBugoOFhSJTkTE/qUCSaTJYvpDfFUXN9V6ybLLEa9yqCSNlkAFytMiOAu7ABS2q1J1VtV7XaHLS8prNVVGnJXdFXxjiIkyMZZvJ3xQgwatBGBrA/FnG38TF2YPF2u93AK2uglVXHTkrktLjlObjDPhdDN1wmJhyIQPHiAcsnegxVFN1ggb33j5HOwqvWHYCvlZByEvtCbHsEQYQ4viMEuVe+amDxWdLGP0gEWqFEtUF4oJsG9Cy8UslC9qSs1DdXaXaEk1JfMlG0LELkISALhJdktaSJEsSp8VnRNJkbqg2LApXU7ZpWfoyuXuvVf3635tx/9b9Ez8aGZMu0STTXxOCg+IbsJeQbFPgaZ0yXaaP0GzL1UoSRGnm1FTGKd2+WIFWBHmpN1qC4QqwuSuBw/3qgsAsvEPJfyfm7wx6y/loe0S2D7J160/wxqOksmNlILFsixVTkTReWEa2ge9phGQP+J7Bv/HisslwhBjOAEXC1FidPkQOP/cuFZH1GTk6XQaTr9HrQmQwbKj4HnVv0VAR+g2niP7mVgowBUSIwQxYLIxO0uvM8nTWnM2A9Hvib6mhx+6J0G8wWUT6FrNHXtINDLRIYT8QIjKp9DpjvAQsg0elcMMxMEEE1IukUCjaiGReNxH0bt0HdBA+QftFDWIJvzl7y5I5YOlsniXPsF3/X1hitg3xJPhsHBh5ZG+8WfyvhBw9MGY1n5IjHRsVQIcS0K8e9CshbyB8N7gPUG585UjBB23/XPf5prrb9uF+QpMuFs/iZgrbEAUN3PemElN4QWH0Oe+g4zk7B6Mr++A5ixqANK+3HR8DBnek+LqxRvYvHc+zfdiRag4Wfe0WAzrssZ4rDAAdgFM+i/+GWsNKnI/fHgUcS0uApYQtYYEjbAVGQvry1Cvs5WtXyIWaPbY7nEx6btOD8eM3jZo0p3zk1avld87QeXCD1Ky2KPU0DBAp4lUxCrMqhQGbRclmYwoDt3BTpAfW714+NgI6jKdhtZhsJRDABdwSIekwS5CqitNHy+Fw70Oigp3aUKZhlni5zsN/A62Ii4qPlJOKYYJcS2pensy6tcB7fbCfz4q96w98UfrgNM35iJOBseEJS8ca8f0nScakJIYLFh8x1BbtoMnWSndLcmpiml4SgrTqANmmwm3oqWsrwe6sojIGSKFV6hezOYAmJQ5tAhQ70MD9QJyXsqOwMHlzIM2ysFuxzMlMXECTbwDVh0vpShgpfMLRE/E9kpvWnzAT+/DBFjWSu4C2w0YKH3PhwlRuA/puJnCWz3kEp5mNEPF5Eyobms55eRLNRZ8uaFkEziNFmC+rxWWNp1w8QC2mmwYuNj6zZUOvV9dxilAgJcC4ejDuJRnZjRqFkRqjGPikuziXtt1NrOTeg/oH98jIzhRfDQLCZ11vGzLBXo9LYz0T7EXP7O3gD7b48mfN7eCf8UD4OOsIQZ7tRpFD+Rbwp1k8eNNJV9k98mxnVMxj8sU8X2cMoFy57j0RLN74Y9Lh4GRPVGZ95nz65S1sP/nqJXkNEe4J93JjRyNA+zFXwvNvnrP3yGudcckEjpxNveUItvnZObKtG/aCGNegacGNJkZsQ6iawQ1CNz7LDp9N1oETQHE+tT07JyM/VeIlWu69aokXIImmIQAHcv09WoyB0eDsNGolKr6Jj7Yo2J47iLmED7pw8SpuqCuViBrscOoO5TiIcLpB4HuTXkwlyNaN9yZJ3rk3qW4OEs32e5OcMB74INgZoZK3BqENMnyfS+pKIBKDJ1KruCn93w4B4OB86iUYXw/Goh4PwtJkbIOuucd9gCPf5bugHUFuQ3U7NNbd6p26/VHdrRrvbNIMaUDj568tGMD19WhsgTs4M43vG5jQEuITbr8rhSA8JlKrucH23s/HQwCDuNvWgCfSZ5ueTr1GxyXFWuIskn2pJQeqZOWBZd40Wc5HpWb57TIZ9XojowgKCd+mklTMm5I/Sd5v8OpJM5mp4zb27inrubPvlxPoyefvr34kr3tQWXOe+bK2/PEzWedM6cCofkvG0LPXzlgxQT5+5oEv1jBLbkQ9+k72bfq9IzU0Oe505fm9V+RXzq+dW8EcmZw+dJiM7DuDW94RNTkPC1X0di79I4cutOBQ3zKu79shDIO4/SNajGEo56aPQKXHrWhW3EJj0HUJ180Hj137MSaaDLfQ6HM9wDn68OOnMSzeVmPNAOrssAw260w20GdEZGuyzRnOIPQGcP/q2lekc3UyQX4sOEeEikh3QULRBbZUTqa5l15gtUUMtxwuk4aK1KEqfyVwJb6+IATCewd2nJPVTqkagK/fHD5/7vyNu9kEhqzxSy20FGRGZQQwsaKKzIq8/fKassWLl6z3WrOOgTSUCuPiWW2kDOSIoIPtM2lKXFK0Ml4Tr6YbPn3ziRCIKYUlNtWcaDQZaK6zrb3Qnn0dtZ/NDtselnUnG8zKYrcfywCqpj7YnI+TrXNR81u7nyNE5OI2oWLQnkBtXi3NHguKxGcpUiEIwR5NCaV72TI5aZpVtpfVljHZEeJ5usQ85oQ4gjvPOwMplZp4Dd3QGbWEdBWgxpDJbfZQXCtwNgvcys7PcEgmMIcQeSfQg8KsDcZxxIrCwDz79Mf89zNQ5CE972NcCdZUOgAt/nOVWt1ujpfXnDleR86cOYL/ec2hnbh5XH9usbQiaI14VZA6dotmh4EGruIyttiniC7etDJllXzi7E1LgzKj8woy0rMt6vw1eqYgf5+lWL6vym8a4y9eoZ2lnR8kmbY1aL23bO63odWnKkrKM+kthnzfCnnW8aQzTARsJTUpTXE0vC6KU6pU8WaVhQHXRRazKZGBHyMtc9KMretWbizctXfXWcAYUauGcK5chbRuyM0unYaPHtj3u0k//fqgto6OgIsbKV0SxcYjSomqJAZcslPyBMulAezaEG/aO3Rd8Er5+nXpO7YxQVb2QKGsmN2bY6V35FdmlMv37I7wzmPyfNjVfjInnIHMlr0haGeebXTezuAqICPquLF1m+rI3wT2m2PbLHrsfpWufRGUPrGHkNWyKhOdsXXagV7y5sQB3e/2PLiOmdk/TpETeeVHoe++s5u+l6PdddP1sgwcAXKl8EWDWbjhqP8l0FZ22vDz0dv0V0du7r4qf3JqbnA2cxvmShdqXecOp6cvn7B2rHz6jOKjKxjwC2cWnhltcp0qIz8QdOQKkWbcdMPSvaCCYDDt7TVLPQT/fc/SScX/9kVLqxT/1zctkW0FQZwn1iCsSPD0JaZzK/GKyR+c9qLIvqVcf6TVAegRZKtDo/PXyquVjtwd22B7mgeoFkFX2KoTdEaK87BxoK2KaZCLd1K201ffnOb/HrOnfwD7eU8wR24GeCY9QHQQ7r1GcGEXQBb+v62YvN9BqAVdpPwtE3+6HAffPpFHjee+XUrZZjZ80yIdxdtUFAhkO0X22UA4dWi97RpRbc9r0QvntTjGJ7e4/+L1dUS/kQ4nQXQwggBh2EahXcnHZaBdEbhodd71kn1oeAnmviShrTUXL/3J7XtI0fDVJqJhyABxs+/T96NEY4kI6jYQirE3M3YmZ6AQtAOjROADIPjmF6ZzOy8WCiCSeIMgDfLtIRd1IjCA7biYwTkHrIAM5noFAWerw+lfwMB7YPgv2Nv6B+lvUPQY9kylT5+i5ophrwjXPm6yzsCxP+geQVdRoE8qcHz6QgZ/hVOlsFN26K8XZCeSQWvQI4cGCejZzAhX+FkozQnFgA4v6TPafmjP/fGghbfDm9HeBSJ7LEnueIK7Ak40XBmJ08awlaAIdKRyGl/vDvRtB59Ehc+7coKARbAc51xpyquEMKy/FoP/sf5kdQAf3wMd7oFO9xxta7hKJKzZcHqtaM1iJeyiY3Sw1aaOUOAv4WadopBeDT/ZpQK9L8nAh7rl2cvl60QRMaxCZVAl6phydWGkHhKSbYaRVZPoinnnfa/ESqqo60nnyypOSE5c0985KMvU150004l6sz4J9W807xb+1jn8owfSk55H3Wm4ICwdfEBFhom+0Qtz97O6bGZ7lHiFLjGHAZ88FdecO3iKmdPOn501kB4Nuouy9MYi+qjoO3aWHzavw5V57Ku1gCbYe/NfVT1BMp4bMFa6c1v6Npps474lNNifIXMFW7MDdhvphT4eYYvl5CLBIPbM0fMpGRm5zMU685OvZQVi8DGxCo2EzmgkOAtCwzdtmS4j493n7BgFZK++q75LQ1cuU1q6tcCXJgUK361bfRlSKPAt2FqKv5cWFJQyTuANDA+yvcj7Oc/h66uOYL8tRGpRGpR0vGgiFG3prWCgXjz21OIvY2mteE7cvGVxsyVQK+78bMUvliR9crqvNiqBnpO+fN+lZH1ysgzMFD85W3IpmU5K0qcwurQgTWyCZFrSkgPXZMBffOtM5Q0jnWg2mvl6Q4Jer8tzBpuvTrhKrgAVn0rTdelpMrBUHHd5Xv6c/GM553Mt1yQgTpyry43Lpq/4fJYzVx4vUsZpY5VmdSJzVX123VAZjBUrZy9a66mM1QYZdFGS8GJDmpbeo9y9LXujJCWQ3bZVBj3EpEmhj1bIZq2fNyaWjtYEJobL4syaFDpFdNeCpnNrGXopWpxvErxHgFW6iQTn/Yi6jr94zkefuQe4LA+44/upuIcTiX/OVgmsmM54VLZEJ51L8SlOeNNGGkWacf7KVTh/5d6Fo3D4lpYTIFHewW7kWEItBzv7o9qGBgHXSu5/Kh24bNty6fZwQzTdT7SB3eqrZOCAhpeaKFWkNsplLtiBhMAIVXR6xLkfDH4WP5OfSzkckjJHH88qLDqXJFGeIS3LxFSAHqAXd8+QYkzWp7j8JErWW5JwsCZuGG9g+LuGpYKXs/mGYVPDEiocHPMk/i4PZy8MXi34x1ScxDJsIueTcTZxYsbfVei6DFh6UrhCfBK6hFoKOvW08+6rV1UEmYTB1woQeEUaApe4DwLn3fj24ePGVzU+9aX8RU7keftlp8MJUglEBmHlEVZTCQiK7OGRhe8/XYb9I8RgqxtqDd5ZFBCI+DRMfBAmvhgTV7gPekNj4i8o52f1n+HetEGU16DeOC/De63BDYVv8W9YEYUp7RGF/rg3t6eNohA6tlUqXN+1hrcWgLbYmI4J4yPAFrRXIdrJyyhMmbe6g7G2bT64+3ms1S/PagWSvN9Bd5wpx6GaZKv/7hboVdG7L0czr14IDYYE7GasTIxTq3UaLd13kM74z5dDk/Oq/+vu4WXsprQtNJlXvdlbqNHocAxdojLJaEhIMNCkR3VJsUFt1BjVLmRq9SisbCY9efnktycOoBv6/fKJo5JqkILoxxRYCBZKsdegf3BQQEBOUBG+e4lukLdueuafE4ye5RTRYAFY8JjiRS+gKuMqd1aCG5XO6MvkKiCpDKoCcyvJS+7TqV5QJjWwOIyxryKeVWmYNZrgmEi5v6rkeByjPCgk5wpidvll+aRIqtMO7Dwgq55+eDgNPcLSkNyOChPd1X+jE26PFK/kZTZzUZyUz4ZkM2QnRW4wG7ZOtoENzA+ig/Os6kz5geTDGTj0MVS6NnLZcHoG+FSUyppTE2i9KZNNkZMOgmMXtCMYpyDCFssVgQ8Jhx8oR24K92Y+xaLv7xP4E9cJ3CkFu8ocTl8HbW87gmfcKGlqtF4do1UrNfS0kOWxAfL1s6ygFWh9snSPaScbVsBsU2qCY2WBGWEFedvTC0/Msc7qPWFEn89ujnn4a8FjC9KQEc0ysKvU4cvboO11TFMl/dHjxqAuW/vGRafqjMkJRrOBvph9MKlQvvusN2wFW8/zXafayG7fyuSbDTlJsryI7VsDwyIDFpzxPvu09u4T2p5w6QJ/dPgVQdqqG/MukSLBENuorsS3vAds8HUkBoZQ5BfTCLL9Gs6K5BZGs9/58ie08bY+sxEab6Npiabgjnja0ZxPf7nny41fgmlfkp8LeMRfJn87JIeGba3C6RlrTn4hu3ry/G0wIg8OXZZIx+vZ+BQ5f3k6Wi3w7ddKnS5aSW+YIyS/VZT6rNrXXw4dhwzoOLR6zG0/JkV9PPpqWLGyTFmyTpLrn7xpk2zcorFDfEebjs6nZ5/UfKnbLUnWxbEaeRSrDGWglziMVaaY9QkpZpo1GMur6UK/w74XYyQe4t2VsZsZ8pRi1WesOx3lXyQCAiBjLx/xzJnPHBQDif7OT8ABrSW0Ii8oOzSPxdcE4audiKrKqm1V5IcC1PUURZ762/CxsoUbVo8asv7MgxA6TaMzxjRW3p6vnCZnCUx6fXY2k5DAJmRlS8hOgtItZTH5GklTJCXprjgt/imp4sJlmVPsvzGfu7jg75nfdRJ/sOBIIf4jpNHNSNUKOB7eRwKd1hKngIhCaE4IbdA0bEd+HxZhOzKWfvx7u/ylX/1vX5LR7k3YCgUcCR8iAUqDDgTCRv2/UL8Hd1+GiGychk9mWsESBBACNx+23TnsvOf22nMrnoDWT1acW3ub9OTmgvnSWzO/mLiX7n9MuLh4+b6Tsiv7L1w8c2DlvExar1bpVe9c4PZ8dl2/3mNHfLYiY3XRRobMX+a3fs0i2efnZl9ZS9ctEh71O7hqnmziyunT5qzYfzKc1hlNOpOc1GHUJi/mHl/0f/T0+t0fD0RU+pczpMOhkt17j8tGtSM7bdCsD9lKh20PzghM63+s/fLC1XuOyciPdxr2ZOfT28NyIvKi6xa1PxhQuW6RzOm1GOQGcZOCHcAJTiI9t+bowlR6dLZwbdK2Hbtk+3fsOfJLupufgdboWXWi3MIaUhjwoTiZNcarWBw9GLRBmBUaUDBfPmnRgqmLrMuPhDN3grers9SZgS5p4YnBIbIVPisWhS4zlG6mN5Rr9+bJEnUqVitXsqoYBn4gViCyRr3ebKTZhIScHXRwVkVgtfxq1dkahiuEraXZEeKlOnMuA2rFeXrzYTojq4sogmUVajTs4GPYDtThC3DZSHnX0HTRYb0ykIHV4nB2yww6RHw14SpgKL0YdG54TxhnMMQnys0JJnMCA9y4NkL4kzhIp1xKR4aIEvL2sfny/H2sNo9xslJoN7Lf28rVW51tZBHph3YhCnwB5IjQiX6wnxyWioAR7BEmJbOJrMykNmmMNFwJjgpBuAiMOrYe9s/9imo4IdqqZbcxaAvyB4yFBcIYBU7ghlS6ZDaD5k6InJrOlR34c2XwbVHbB8+Jr0JvKm7SoGcZ7CvSFGgLC0upAEOAYSsDe/iAPqKkOelzTXOSiKYUbY4DKXu6trv8LHpKkE8GYl8KN64L0oRcFI2XEn6BvQw+D25O5PZYsYYguwjMFHlEwRIbuUik6KyDXkXfFtUAJ2L8iYL7YFghEmo2D26hNAQEChuAKMTuDT4oPaMcfCbPKmK1yUyumlVskzUU4Nv1OtGrvUXkQ4Vh1y32hLxn44SvFR+/zWp2MtbVYlLm3olN38lwBeIcNj3LSCekFLPZcvBZxiY4KJ3P+oFbcKqA4tuZjlqxupCMygW/QBcpJkafEl82FtVekJ0J8BR7+KxdN4l9vJ0GVvCpFX4KpomRpEI9ulj9AL2gIQc3VSjoAWEE3lpqiZpfkahAnDkFLQ0/IEnggmREYz2YH59jfvDYPRA/kGrYC+Z9RoD3qWfO+55vREC3n68qJF+6I6h+GCrfHUF9oIDzue9Ho8FSQ/xCAV199zpgKSTDUTVKqGv4EckKFyRM+Go213fjK4rAFblgEp64oljBEFiA1LLswHxw+mtwOs/h9PMzheBc4ZnnjnYDzrtZHleC3rAvmNBkm6F7tIMW2HFoLzdIPQQmkAyY7358AeR9YSI9Z4IUdA7YCM/tDICdC3eCcxvFTtgrGSlxoMb6M9qdMvcA+4sjV8M5SB+MfwndaCg9JirVp1mNtCG7iC2SW8WwswZ2MfhTpYWsJpcpUbFhW2UNOWJfXZS3mtaE+LP++PryzgbQJZPwDWANQcwWE7u9QPYTYMTA6eGj50w3vXT88oE96I6gBjiK0ARbupvZsdK4JFjWeDzcoxCsszrwyUQd38klCq7xmcLfLDMS4EOqyYKZknkiG4zNvJ0dmhWxXZv5MBP0yGQznO/emHVz4fX1x1fc2HA9/SZYeWPMzfIbntdJwQcCAL8jxnquX4Z2jw6C4ExFLvrQWpCXnra9bBOrYEiBRFGWV2UulJdVRs1TajeEoF2soKPANyhAGyonBQJ3nSpUp5KrdPFsvIwU5PdVJrKptFV0tnjVLKwfK4YvCvWmSYdWAu95KbsCmEJNXlo+AnQX5IWkBtFoMROEbY3197y85g5DShQff3/p5HmG6wov2O2raIss4W2sEt7I2mRlVQhaNZtZyaFtJv+zqRXbWTWCrnsoAMG33xFj5q1fhnqZk487uJFV0GX5R8xF8rIK1Dkd7py9Y7r4MNSpeCSJ42VKE5vW2CHcF9wNf6aI70ZecGpw6DZ763HDaSfbx7aPrA6chTsaQL1zUwEL56HPQ6EYfeQfD8VPkVjBYXto+kWheaGARMNrtJlw4YP2WkzASDQtZGhWzEOTQnEAVvhQrzeD40EczpDUhzskVQC5sMFRpIByYYbouSUp57E8OZPVJTJpGjY+UgZrxUFs3DR6K5LkBefZEnnJeVZbyGRvFU9jLfzSkcpaUgy0PnE7UnwfJwX3sDBcBSyQZkeixQVxll9cEg/T6dldReGsLgYtLp80LS7xWjZK3iUkAy0u8U2Ly3R+cbmGFhcx6NJACJX2tUVvMhsY0I37SKiHz0WBuvildIR9cSmQ51fyiwt6S19zvaWhIk2oyj8OuBK3LghBa/484MqUqoHD5nvyZwGpRebCzKgMfzpWVLG9Im+fvMbKnwOsXovPAdoK45Ssjj8HcIqy+yBYkOjvhEX/ZOyCsJLiHRAGEim2Qf2JKOoiDvtrBhkJsrsTTiupr/HTgcQe22z0Ncp+cN8MNAKf26+k+FP7gUSFbbwn8ReQXxa0gOD2ItUsyu4o3Ayy8FVPaqXdUXgIQYoFSZy1JxVFYf/snOdVdVufl1nJZwoEKhVsw03CHsKgVe3a598831JLTnJfSpAV7n9JE0oIcJ7QCsE/JgoVkEKFCvep0a24RW3f5aLaKPdtdo/ilU0exTMJ3nUYY9zAnfw7DA3wnm3HqEEgM4k0sHY28a91DAbtPFrWMQF85IF2W1gP5S/+vk+B9+tn1L20kuGd8LKRZfc2QMtGCIEdDjorEAMWK/7CABHPgMX/yABXARkjmAk7uBF/Hh4JQOzxdngs5HZPQ6/jRxwQ2AziD/Su6KXdwQ8HEuG2jq5UEfWqnCI/cG++VjeFoCO2+IRuVEmqxGQbgZZ3z0JrLyQMQh9xcbE2Mp/JVCSHhsjgG/GskLnrVtKr1y/eNl/utbRgry/jvU9x4pKM7C/gXMSpiWmpJjpxewU+NJMIysTkxwLYDXu/oD+YWmkFG5/FpKgSo6JlDS5i8qT7pKJpVV6015FL/jXy82eKD+9jDlTlXayRcc7iC+YThy/InA4TDsDhKlhd2/ZBf8qpCDHhQDBwRX0g2rTsw1CCFArgFtCpK3GYcH6LQT6AnmBu/8ZX9fay5ldNtyA71v9UVlRGitr8PUckTRxZ2/f/jCMuf+FIa8wRiYLniPQfOLLC9J8cIRXu8PibBrfGfh6qP4U6Sv6OuvoUKhv+cCP+g0ep+z3+wqKgM9PQyPgxyBoMFv8DWjgY60r9GW8uGI2HFHaXWY3wHASHKZr8oE0KwQzFd9rDQXUd/4LzIRjWkfqzdLkCdCOaxMtAArayDR6BYG5YEcDPCKANpH7zQeVI56kkyMloKlX+VZTwkuQfBQnZ+gr33IeyfQzn41VvuNSsTYzT01pRuCFYEc94bfEInSNf0CvjdBCjSUrIiNJLVCKlThsfLxsEPtlyhU4T1SQ+Lsj4SmLQJxhkaPXsjsnAyQHUbfTDaTplOuzP5NpmOnLLekjBE3FyOBsjg/cb2oL7jZ+fiNVGtZHmOouM6D+kzsZy16ws9jYHw6zeSHSg11jf6DYGCc2zRnexX8SwU48RPb0gUQjm0NzHPaiGD8Xw48fdgCSI3uwbsHa9rDn0lHz2M5XD32KeaDYnmhMlySIgfvQUiLYzhhw2qVIGbojL2UMvsZUFx6V+ZNX9RJHXFNwJ3tk9JTUtNSPpZ0v7xlugARCTvf4qsxx5mdXr72UW0rn7i9d7+65eDUgCH6Jw22+xt5xP7wHGOmDcgzPr29ZyR6XnVj/t++mYvrDnVlonOqDcALzgAHnf1b1nxrGxmemsxaRn7loesiY5oHPgohEMLGxx8/czfPP3jy1v/gaF4mdFSJ1uT5Ne1vMR081MrF6vTJNnskkWBi0f5eBDYh91q/xUXWj591bykXsnbEKGFtBzPhpX3+FUfGi1MuBseelouXJFQ2yv62A0iKsX2STz8UKHxnjTcL1MdcSDEXuDDSRO2uQdqQpeOI+l4Gu8aJ+nQAcqy+ZB1g3Dg9sXZPQnKvglF0E8R2vteeoV7zH0FmYOaIcW3Qocb5P1euubDnzCUM9/TR0tJAf8a/bov80dTd7gy/6PckcPbJE7mny/oaoYd9D5GW59w1a0vpNutrk4iXagry5Q3htR363LC/WVxbNaVRRNruoLk9zADqE6VZdgkhVXsDmomZ9qhD6+9kzaezK1UcmMKT7FxxwyCKra9wQ5QlUqm2DkYSspshSTPJaq2Ywa7AzrhZEmQ1yaPC0hMd3EvAC7f4V7hAoj/8jAp+B+D3yTdcyatkvvQrZrcAYrZze/nYbP8Zr5p7dTDtpOo/Dd9eACduCcUuZjDbAmlrFWPnt3P8U/voNZcIoQThFNAOuEZCtBi7eANuR/ehFLYHchnCoinQUTwAb0NsgfFO9A2F/HVbhRCD8R3aOAq2j7IiHshz8OFz2DB955Hz+A/ULwqeiHv3s8QvQthfAyjwlBR/zxExG5TnEezGp8ew0T4PdS+BEufySCkna/U3PB50LOeFf6O+WJPkEStJKOFe0GDkInWx/26nO0jAQdv3o8GLQJenjVeX9hcOHlQvAY/QouJEUm7n+4LGkc6CtsqBbFwb7CQlHCPkOROUViSTzPJsnBz6KUs2xcImNWGPwTVknKYL2UtG0IEGmW6vzjIiWK+AVsoBy+EIV6sslKJi5NW6Y9KAkQWeAIIXdR1B9kS4F7wEL4+HgAdC88Dh4vFDc56jqD+w/J831wIqEgPOMs+J1m3ycrBiNxNhMpOPADPOnS+ai4ZtANaOpZGqdeS+A+/ORL52MKA56nPsx4ziMMbBhSjCmjoZ59vwAP9H0I4wbCeB/uwePK7md6s77HQ3IDgjfBi7zWVwhX5oW9GnefzeOWWxEqiKsntyPM8pnUrIaDUnIMviMFewy3KwNEGdCUVaBN/P2HeQ8dvQjYA6KpIYLDQYFQmcyiGZNbaDzET+wx7Bo5bGcQemeJr1gU/pkMGAVLhdDVBwwQ5a0XDoOTfcDkoeJ3DlSs28Sfa5IrmG/A1DI49Vtx3m4hGFQGO4lAT6AXnt9z1rhD/jc8PYLnyV95OgVPlXR7KFwzbDZWMi3UI/TwHeBuQOVK2V1pW1BeiH1pEWUSP24J/zlQdKQeEfeBjOD05HkPBNyNjyNqjZtRwr1Hnp9OkH3X4hjKRziY9HQT2CAcFYnA7O+1GTIGh0U+Ir565Ywg4fl6shYBu8FpfAhhaz6aDsHCSFQwHXsYO+BwOQ7UEDu5P6xNOH4e+Mhtmj1NRw1RyLXNa8Lym479AB1w0dt887YzrDU/D3TIA8OtQG0N5BOkr69ZBqbMqlGCKbBDDWlyte1oZxWvC2Sr0RaQBBOFugRVokFmvHYu2UJfPL4/IRdn2SfbmDS+UeyW/9XamYBFcaQPn2umJ9NkBJoGnc50E2PUGM/EO1HxjIlm1RhvQcQDlUPkvhmuYWZ6Dma4b4ZDZUBBAVEjirdGTWLiEXOwukZJTKLRrFaPxe7+q3tAzcZkv32+fXiAqerumuq636r3/b1U0Pt6XTIaJyu0+coUOfGyb2xyakYmDQdBNxEXw1PTia+U/wZOx4iHC3l4uniqFDgb7BYeD7Bzx0Rfvty2OF4el5AdR9tJ+jt3ajU7mZ7h3Ewe7T7AoYnfCyjgm4Mj5809HixlbbUC6vrxEB7uyKXxAEpukG0Eb/uLgnvAxdjesABQ50GWF/tAlkIMp7bTLLlBgr2w2s6z5AYJQEtboQC0fDyzN7mnqf8ZFP03tMw/u9Gewx/7cigA0/mHf+x7WIjh39ieJy5tNR9q6g2V8DlsFCibtkLhShrv5Ga01J6cQFDnk+uNmtMX9YICyZ2O3KvcT4tQ+Vn5dun42uMJH0qfXsleJgQ+swd6VY7RF+yK6Y3b2Rv35HlbDRqjnklgTu/t9uDOOUJ6d/rSE1SH7Tfc6UtPiOPvms7nV7itD22ObuuN3PkkUoMkr4O8dRlfPr9IOQmnH95r/4w+Vw5HZVPHI99sZUJ07B3Hn/hVi7NKcEsaK8jSSoUgnAtQL7u5r0D2IorWKYgAQU4XbuUFdaVCkMqFWy/YwfFPbxUEdNZ2GLwutd1dpHgmfUEwf2764YKMDqxcLM9iahyKnt/fB1+y/TxU+qShgy+4gul9DX2hzTJfKKQN6MI9m0goRcEAHIW8fNBLl9itwR8T9pYjWIMPeKu3NNjHQ9/iVZ3H84ZUvPkUuoUVjKrYvs/gF47d3eu5FH2+wX9+ej9r67I6zrF18eZq3LqnZ7kfLRUi/i4lvuFDv4E2+/wBs5k/De594B//Tw+wtmqAS22PlwolLOwIcif5tiBsCXLjhD1B2xF+T/Axb+ogU3Av2V4nKxLK4tDCP1Mbp06NUiYPGAedRaqsjMwseVZheo7ZUllQSLfuun6s/llI9+f26hJI3cSvQWgKsDtzAO6C9ncsj+0eE/A/wnYfU/45ttvn37Hd03n4dq87iX/XwkLNuyWG24i6VQY4QZqzjZnJSSp1Mr0sfXnqsoxYMLZ/iVrfkEJpxElscKKWyVyasVS1dF7++yXzCiSsSqfOzM7OTL69sT2OLssoSyvPegsO7q+MVfO8c9UANZZlVJtogxhJoZV5+T//2t9gMJqMVOHlUQH7GCRBqnK0Ep6/YjAxBkybozGqjcrK/m+BweWmsvyy3AHtFbebi+UyDnAVewAV63jPwjlZnDmzbR4ZLR71SsCkSa8dvElHiwfdm/3rHeB8QvBBBLiLMWAEeiWlzZdMqYIzhkDyin9tSgxYAPuLZM8DlYq9gMubNwct3bo1LoYObxGZVRpWQ2Wx2ekM9MaUrCbPzOrNOvqbwkMdp6lG4BAHJ8GJ0CFu84KFB65lMyYta8iiMtls1byjU2/d/+5vQMzIWOEHtb7GGPA+6oFrOQtplYLJXlZ+gkhojozhRM2bm8FW1HSCP1myL3Af4catApAswPI15pTEBI02kSYGQle1iHA5azibe5bWmfRms5x4IS+bF/jXiAmXjCyUxwyMGJj/ruGduXI/P6M/lZam06UxaZmaBHQlQ5eep0FVUFam15UxhAdwNaDkoFgNpWlQTKu1qmw5MT3NlJ1P7xMTmTk6o16fIynEcrV52lya8EgHDhrgDBzkBw5k76fy87XafCbfrC8VZqRP7jkCf5sDCRhpdnxsBBipAEu9UEAdHx2JAjz9ZjUasfiFxQ3F3+wbknbq1NsLNQpikK9AnfIRqFNuv6NO+QA3BeGotDPjfkufsncrQkEEBvxHBNWDnCopkebDI6jc/hhBhXqIgKN7/KPdSRYQnfuEV6Poc5bFdXq9prArHJof+gNaGty9oGvpw+Fd7EO/bsJFCXZwi/s0BH3tGoIuyl4NQV9BQxD49JSShI9br3KixK6c6ONjV06MWr8yLiAzjBvbX9cqquF314A7r7/fp5Zo9rGrJa6onXs3iVZjRKd6S1V8VVVVeSNtwG4Unj/0mRyGgNfJBJgrCihl2/fKBRVHmnB0KK4sqMirlMjQIAfauVoS9TyNgR4MSFGxUlkWTxGdWVpRvBo1OXn0joSyFPrL+Y3hIo0R9U9KJ87R5+fmoOGuLtQaZd1mBXFW7lUrbzazoJ6tL60H7t8RCzttkUDFb/bI1KJ141lDEBPSgN0yKDcy8zDoAon0rTQx0jc1UWeMZ2yDMENpsS6fenR7DBxSySxXNAQvOTqUSk9jtelMHsZrXAl44hQMjg2DXnAwnCeH8wABB4MJoTTvFEQgFPNcQzoPI6Y7aPPz2Xzq0td1p3YxRIFvdFHLugIqj80tYcAMbK8x5zzdMwBuIydtH/glCJWD8EdXv64V8JxoPbIA9UyTbSTZxvfMNqkMjdwLTjqC7WABeRKWLsJk4Ab46KTjLlDuDI6Aj1BkuRB5QgreQr9PQAt9JIE/xi2MaUOzQK2CECc93oLmhj7ogsDoMF4gvgAm3p7o93SFu/XSfFv5G9J/OTneNERb2F4aB/hYoABYn3q7dHLg3V0SH/rW8T5UeoEcLzs89Xk53cEO40jvzERz06r/jkR7WhCtUhVKXkjdrfhR8Rssw+e21ajvJHHimsjayBqP1Fq2FqysjaoB21GQG1eTWOt53YH4xfdxtm0u2QCnWibQqeJ4TQIbr4Xfb4EfwZyFkJOoQlRbguVR+7O3Z9DJZ85lfkxxIvAVaOReOMUQN31ydhqtO+U9YdmkFh72XQJXQVoETmDE35VGbU6OvK6luracPtF6tv58bZ4hT59nlICVPRYS4tAdLp4NZ1NZ4tmzCyveYUAsGCOy9QcbyIXbRkH3rVTPOjEoB/NE3FhwmYQ3YNLUpSLQhhXri3OKDZKCQ52mw9QXl5SxF5l/bOuJITXh8/3gWLQ0IO74mjuMHxUfagLkRSD64Y7EpgTjyexoNio7WrIgLQgOC1ahaZKCh8XEdR+ZrcI2sGV9iy7Wg/CxvWebQJYm5STRhG96hjad6tkhJnpZpmkaVXqGnPBNzc8oprlmFJ9j1pqpohJTCcMbqvDYrzUPiNuxqOgFW8MnJitHpXablfUGBbFdpyD6C7aHaNxa0mI71OIILrXwbq19yYKM3AR6ke3QSXFxgam4OMWUysCZYiidjeRAVzgIDBwD+jE95GIsPiMjNTU3A/Wl8eJCXW5+PpqPX1psAdDieOKsM/gbePWqNEJHbuInNV5h18jr+tbxir9CMJEPmoQgVMeAf6HuNnKfM9h0lKyLLo8ISYqOjDfG6ePo/LGFY81jJRZxwRnjedNZiWlf3oE2OXhbQ9YkWUIiouO3JRmS9Ml0NQzQR+ojjVEDLOLcu2V3c+9JdCad2YRypb6lAMP5r6tdyq9JeU1jbz44gtcz5q928qHp6OKAvqxkdpBVGVVhJjpTHB6TGJamT9OlM/mv5w4rfh1lpeh27vf5tyW6QkMxWoWg5bfI/tT7tmFkdWrdlm3RiaH8I2l0FVxofl+kT9WnpMqrxYV69EObjlaCd0W6ImNJCcrcFlBXc7+msubXmnM1jvU1YF0N8K5x5uZzESQQj7oNRVA0ajQUQ1H3KCACou5uIKIjvYZMnjxkyORv7t37hv+dPIT+4C1Szxqzs1m1ho7UpGZlUInqMms2o6rLqkosiDcNaMitq6qVN2zYsYp+JS1XXKvLTuXN2VO12RF0RppYV1jNFlFF1ay2kMnPwCK0xkKmaw9mKmKVhUxRKpsWLY9mU4pS6dTick0+VZezPY+ZDhRkdEb4SnrjdXEua8zV0TpDHmum6ps1qwSf543AxXE7SHUGJeBfpHInjJqUHypCYySXFwMkDY7cLU5P3oPDdk2lU8QzMyARNkyeqc/K1dI54mJddrUpX3Ky+vuaz6iTl5Wr9jO56eY0Q6ok3aBOKKGMYrNebxJql0tt+CtKbBVK7C5U7PZFA8j0jCGhqWMlWrXgh1KfmaeldeJSdWWhkTlT9231eerkhZTVrShFk5CiXpNY/DRFVJ9N1vPP6A2ciLnT6Mi9wnWQFye1z6WFw7KFme8EZ8yRqDCUYZR6eXZJoYE5UHTGcpA6cC52eRGjT9ekFGokOeJcnd5k5jVI2H0R+zLQrwfLHSFyuCM/HZYSc+sVxNDK/MqCsmKJzDYK5FkcbSNBHmn5x0gBOSrsJOwVjl/5g6JpA3ll77f/+cJqHibMX+v4WUF48Aev/+0hxhj+KJTodGiGEasVP0t5NE8fuOwlOIPH8xwVNraeSy6z2D5+WfEMd2mJTb1b+hzuUhov+gk8HT79P4Lp+PPfBpx699H+kKUznv9SWwVaYGy1gLAHvUpHq9CYNBbONtNgejScjsGZWXAIfAP6y6EfGApHghlZNPS1AF8MzDaDQWA0WCkfVEzCcqiYMOp1KL8JikEhGPxp19/AK7NgHj/7o3HS0wKILh6FuYUEbiN+hRITDWZHw9kYdM0a7QNflEP3n0cAEe+q0wLmYUBi/uEO6CefmEsGsUui19D+0WvCVlABa6oOhDMR7eyZJvle9mhNO31g+8GqFqp9X3RAHVMXwC7aILdrxJ2649FUC4YIODHwai1xRzmW1zKAAFzndbb4O/iyeaIy1x/8E5UYruAj+9RSHiifaHzx6lquDjttjqi8hkBxC3dVkGkmtgC8xdk2BASTwB8SwBOugeg/9ER//dEyigD+YA0g0I8/vc4LzkYLNBc4h/8PXMBsMAc8+c/H09D5HdLE5mQg8SZTS49RzV0+h9oA3arAQvTTz7L30+OLRhUxGTokJVH5rL6IAa9hBawxU6NmM1V0yGpRdWSwdQEFpa8iQQx63R8KpPfP3rzEjxycjt/PODpUCkYpirrBzO7mWo9dXWe6JnbP6o6oD+324x2H3HB7xnPIyLD3UjdSifHGvHjmOveSJXt7WkXcAMLBx+5AhPDx5X2IoDV3Fe9H5OjKpoWFjKFYlI/GhnTeJVRGlipTyxAv+WYniHQqFauioPso6ADdhp2Y/NUWJjNYlK4xp+dTZlOOWccQ1xzMO0TZpWWaMsru3YRBTe0EOalHJtq8c2vnbTmY8G1bJ014Osi4R5tj9lvDrCENW63A+fa8Brbh2u2Z3RNuH+te1ADcrFsbQqyhDe2xHty6w8u7lx/2dHCYSDh4xnFHwAoSSb+3p51/e4ckOSddzyKxBTuXdix65zsSlEeditoWGxe+tSq+nmkw5VXWyh+OOjHWTHeEYISD40Q/9NdhPxuhT+S1yeKSojQscwBd0g2fuAJjo7JSVPTkzfMXTZCPu/re11F0riZXnauVwNPY3PzF1vAvJNockzaHqrGU7dgeWxGxMS1826u3Zt7KYpZbeZWNiQd5zZWJmvxStMImLDMmluXrdKXMausRjK0yFeXQN3afunBTDjcCP/LtShHIteemWl+CcqOZ2KoVQSeoJ1eX+ReFdUpUheqiIvln15oPo8szfCYCS4+WnDF33V+iaVCFnU741H+WHL4JXyY1ycnaRArV5sTEOD3LgONoFFNO/CpO9G9gce509A5bv1rHyx1VHUDd4cwlxyh64zwuA28Fl7wNzfz2cBsf9kPh9ugyqSEWXVdIudBABdcOQ8qk+tgqIUrBhQbwa5W+qA4+agmKKmatQG7lotH8f/ZzZy5Kq+CKQX8FOP7lrM+JOC4qm7ehR+GD9nAwCp+OPiW9/NSJenIUyhsMQXE/oYxtFr7llLQNBfxQYOgTz+ZvX3bmnPMV3FAwDAkZV1Bizjm872IUCudDE1GIFRwtj+l25jYKjpZZ+OGTCG4F73nZHiG4YhYiTn+K8tLnijk5TiFEPJRyyeF2N83oox/6eBp4KDx+uZ/Q3d1N4Fwy70GZJjrsTpSZeClxrAQ9eVt6GbiMvz/xwSTgMrdb+eB14JLYPe0BIRmEXpJ/wN2hU8EQnnMF18uHrBeKmlBlzmo9Fj0mVbNo2xomdNVmdYRWos2I1GRSGdpMbZqcqDIrzWwZ3S7+tvmd1+BLc8LWBPiWndrEEL4+u1VWyx55U3glkq7TnSKDk9eM/v5d4Ahkt2/f57UPeIy3LY1HeP8jTeB635b2eYF2VhK4kvOL4h1B0wRQPnUG3Q5GKC73OYMOzVBwh9lLnIvV8cZXIBKVWlQGKhd7zDF7zBIUcyHaYutvcbzcBXLRxJGRKuV98W6JJhf/nFcuavgs59pX8q9VX2+6TP/oN6l0LeW/NGl1IBN0VuQnPjE0O0udqc4cEDxHNeUtua9xTOs0evK+S7GHqLajhR37mKb3RavBI3IeuyBzMQ0TucGiru1nzBaq8UL80AomfzE7bb48DmaSc2JWRq2n1i+s/TGeUZ5mu0/Jj7MncjrQlPYJkgCWosz9FZj/6sxlpqFGY4/Za49Zm6ZA4ZllIKzAZBHTVbPn/Mv1BdYVt0o/wy06vU6v16G1keGMq2ttq8GkNxkMhhyT0fXFY4SjxMnB0SHIodXhseN0x9mO7zluckxwTHEsdzzj+MDxkZPEKdKp0KnKaafTSaezTp86f+isds53ecNlsstUl6UuK13SXDQuZpcqlw6XEy6fu1x1+cYFipxEU0RnRI/Fb4q3iveLO7AXMHdsILYMs2Id2FHsLHYeuyrJl+yQHJBcknwj+V5y94UC6WTpNziGD8JH4+vwJvyE6wLXJa4rXNe4bnDd7BrpeuRFjxenvhjy4rYXY1/8TDZYNkYWLFPKdDKzrFbW2u+lfgP7De6n7ve9m6Mb5ubpFuAW7BbhFuOW5WZ2K3Crd/vW7Y4bdPuXu7P7ZPfl7hvdo93T3Kvc290PuX/qfsn9gftjD8ZjjMdMj/keH3oEemzwMHrkejR6XPK46fGTx98JJ0JOjCTeICYQ04glRByRSJQTdUQT0UIcJk4RHxM/eLp4SjxdPd08Sc/RnuM953gu9Vzluc5zi2e6p8mzwLPMc4fnbs/9nqc8P/b8wvMbz+8873o+8ASe/yAJ0occQo4k3yR9ycVkEBlJJpIZZAFZT+4lD5Cd5EnyKvkt2U0+IDnyX14vetFer3i96TXT6x2vRV5LvPy8NniFekV4xXuleGV6abwKvbZ7NXjt8erwOu510etbrxted7zueT30dvLu5+3pTXkP9B7i/ab3NO953su813lv9g7zjvFO8s701ngbvfO8K72t3i3eh72Pe5/xvmBb62WNxxYkmxuVDAyxiXibB3MiEkiyklUMXNdzJ375uqQl2gEh2H0DwEqlKyJq6wy6fJ2eOQC8RYAVd8IRIl22PitbHrqYDecRh00X2T0U9EQrYxgtRquQayL8f7Ntbt8zx20+oIC3mhgZETUD+lJwQK//vMpb2E8FweOZWlAeIR6nDBlGjwGZdnNwQIrBiO0fQuYLac/pOQrushj/D1uOYIji7pKfrklHDYLuUP73YQADsv2Xpf++44jHvqrAX0HLPLz3LOMPTjJqYqrDQ+IjoiOqorZby2uraZwcIZWR0eKxmndXL6Tmzz90XcNEi6GD/tK8y9S1i5/8Xc/g4IaX4HygUmoo+Iqus4qBg+L5PgrwJ9tA/3ELKHaEAt8eVRf6rDkmjffpeb2gfkoG65mGwYdc6bNcsGepYD0V2HNAYFwZZqd6ccN7fur/DAyMO4QJ9C/0VV7WSGyqhnepUDNMAVPgEZAyTNFT85QVjR+UEueHKIjReJqU+LVzoBQny+PL45OUyqxsGrrCEWXxYDiQifLMuQWFclnsGAU+gVfww/+ENwMcpTnGH6T/a8TM7wEz+O9kuxcE2W7Pn2gV40hym8tLhnuU46X4cxRgzzT/d+qeo5XPVYB18xXUPYcqn6/u2bnwP6p74qUKwYkkjk2V4tCnVHE+L2slAy2TpcDJINq9W6Pdha7NRDW2LjJ+/YaIstaWmvK9e2oTAulGHXkgsHXJovUBa5a3bzh8vLXlEI0LcO8QDIcv85bKSxT4UwcYyVkoFfgq8BIZs9NyU6nohNhoI6NPzUsrUIGpI/rLgjTKqXQk/hfp7suoJ+y5IvSEwQrwLv62NEmB8yfWM/74MH4Ff86xWPE7uWTpm/vAOEEkyPtYG7Sb+a1Xw0+n7Z3aK23gtn/aB6KhESlvw7ep4b3jkOo69kPelgngFUX6lhH0eFBlH4PuiMHAykXwJTQEnQjZLy4q1hZRcGVPh2h9cthWniGrs7ToWyhhkNVF1tTKc1ldThF9BWwUgXFo3EEl9S4dwqVhPWPBTyQcJkZrpxOiVi0bnijHSU6JweGlii/zUN30+GD+6ePmqaLYom10ibGyeLu8Lr5yK39Wsez41hNXzp67TeNcEhdKNsbUhwQlbAvfVhbeZMz5QRqbGKmSNK1fVrWEWvhBxJpAZu2a6AXvyxdWf9C6lg5sOx55isL/s72mYKtJ99pqrm3fr61Cb3Xgky8YnHsVLOBLTJoeswZKkDgpRvKjqyivgNevK8pg42l4SayE40S14vumimbgRAGxGDb0vChKV7IalTzZzFbQoEuMa6ViAx77rEa/G+o9zTm/63sSJd/3mpV/otGPBaik+DxFTxU2AzW4tFLo8y70uZCaCF6HL4hk7Xn1+zvkg5H8s1TzYdgaOigqMDqACgi0NKHJol17rFPeoe/c2Uo31bRU7aP2tcQE1aDhmOe1yDRFFdlMhHgLDETvYyjN+7ioUGIyX2OLKLBOjMTyN0RjILUFMq/K01j/AwfY/fn0YeyY4VjuUdpYXXyj/SygwAf98wpZfZVcRqYUQwY1OwY4pCSD4XC8SPamYgqulKJWPEshG62QTf4p4uMLB1oOVtD4Yy1vLA/OWMFuK2vxuHgP/HQVRNTe4Z0IRXY+DrW329cikqbAaRR06m24VcABu1ccMq53Bk0OGUJDB6DqnUJdxOAVy0JIofb7gjghmS38kCF2++avTWCVvH+2N+AoGAQ3gDfgcOBbW2bIbWYKPipiSynOW9wzHfxAQoJdmO1Hv5uZFDCBguRAfnsHfAAcAAM8bhas+sDE5Kxhx0MHuYw/geNP3/iTN/7UjcbR6PIMv2B6uRS3xfBqkCHrtOEUxNCM1VoaF6vMSsnOQo2s4ZICAAzn1EpLghWU3vrIgtumsOEK3EwCfNI96LAqIHFTEA2WYYRkblZlY2YDBfpdvF1kUudkMmi0ZtWsSk2nx66MnctvN6zzM1etZgiHqgxDNsvKCUe3NDYjkYGHsHg2o5gmml3NeoPJyJQWNB/9hjpS6xefy5Ru1K9fId/ELohcS6+P3LjNj5rxQeepBIbo9NEaDNoCqrGstqYmoXZL8qZMv3GfDQMuDOHjAiT3f+SJ47aN7HnunxaP4w8O7czmOa2XHxB3bZPAeFRrqm3ZUemRkkSVOmMR9Za46Lj1o/0XJAc/b/3sKzlgIAVc4BRUHQOgGCrebp1zcBbd/m7DqqLFkrfEi9S5JSomo1pVp6qVRIgbURsicgDPfLUY2CqGeHQx5GbUOTrm5NavrsjBWOD06e0fH86Eo33Dp4VNopPWBo+ZI48xsNU0eJOnoz7hQ3kc76VD9fz/waG2/E/ZULJVof6op/oH1e2JZLa1qk+0ypv1p3fup61VexqPUrvbkvytTEECq4mX4+A6cCP/wPoTB6xX3zkeDpzv/AD6M2N05Cp2RUIQvSDUTxVFzQ89XZLFxB9kvy6XX2u4d6v0APu+lS7fyC5fKZfpNQatnp53btW10BsSozZbn01pxFnZqKWyrFYrL5/cMLV91ppZwVPiJ0uEmCxjtonWi41Gg1HH1F//6Nq58xKdTm8woKXFc5BMOKBIYIHYp298uDLeP4AO9I9a6yuH7jdfAy5nWttOVtPBaGb3hSmv+C1KWKLfFc7jbtpzd5YhodzXGlkSTRPqzMTQ9PVzjwZeBySQgZdAMDOqmz/mnrh52Js04e6T6Md+HMLEN7Mdh+SErP9R9mBVM92xfU/RbupA42b/MqYw2DjfTy4LqRHPU+Ah0ljcls7qFbh8s2KlAidXSnEwSmE/9cdBAAmIN36Ezu9sXL4qlq7BgAm4NR2miZcdatqyNlt4r/VJ61j/kJokS2l93l6GKHY4veajidATomEDboOVQDLre5o45btRGiEl7iwKG7d4qPzl+3P/DkR3uh7Rs8B98oP1qxZsoqHb1yK/+uxdZfIz59s+p4naS+eWzWSqekhyuu+ySeNmnu062XDuOhra+k0REU474g6G/kUuA2+TTcr9G9rouKrE/Hktki+aDx25IO9+48ToIZOnj4zX+7etpgtSmyNqEyS4fcMbDU6OBuD0n5Qa8R6pWopvkfbUYLiAwtrzbxysR7/hYD3hRvHr4nQwBfsd7mrL83BXzzHuXQzk8DUwHuUmLCoo6Jg0TzDIMJnNZpMEvNvb4/5snx23KK0fWcE+a0gbbt8H+tNNoOfvAOFY89704MDhrC/Ti4oYwH6C8y5YVtq92+H7DftfUaBRGwZWgw9O7q8urQZsdWo1rg4azQZS66cIXtpQ4YFL5LPbMwtmbBsZyPx+Q+bo1ao77Yx9O2diIenLvqOcRw9P+iDU/zf7LufYC2i+BXjFlbza32zTyLjF5CwF7pEoxbmFSguYUQVCa586HQslgXzgTxCDMn/oHJeWq8nJ05ty9fSD3bfYfKqjJXRjNVO/in03SA4bxDxTe+jRYcAdSLofAHdmQjAJX8uaELGZGpQGqL2MDNBkojg2Z1F2NKNOTWETKRgoBrN/EX3cdHr/l3LgDD13jp4LHYJHh5cnWWpKKiqrE4tijPTeHQdKD1LnL2+a4es7b+lGBs3CTqKUtCRVvEqnypZzLmKzwWTWM7Lpny/47v6li1cKaF0uq98l5xZircXsx8LMKjLgcATXwztEmeM1RIp7WYdwvlgla0pMV7OpGTQ83fMXUQiogBIMrbin0zFiQhmCVk6G1iNsG0XsbOtk1a32aRlIsFlWEqrFxCCgBndFMtC/z88KDi28rgM+QxqC84b0sN/3qU2f7/j8HI1bwWwrmGZFq5XJO3C2QoHbZVFSLVr7JmvYwIQ0YXw+XQxAJLDh38bysMSctiVXKYD/+jMgmYle8MXZE6av21DZGk4nV7G6SjmIxPA+9WMQFPAbuWKJwlcqwk2KWtyjUIFLysNCCoOoGbM2zP2gffWJO/d2Xi1klpw/O+8GdXXn7ZtMj2cYOfedNTPWbmlq6zxVd6qpITVhJy0Dx8ApsjwKe09jtjDgFlbM6hLoDf7z2SgqDsP7yKZmk06fg9tR4y5C5tGE4rHjSOyVhVfWHGGvoKYlwAkcwfIjNX91BlwfkuDzZcN4xoAdD9fzI4+CK2G4H8QlFWwlg6tFVgzfAZx+fr0LrLAA767ZP2/dEWPBeaEa5/md6XnKjKxnTbkbpDqDnkd2CmI31oTzU/7THQ6vn4cD5yxmU2jIxoCn9lv448novSpiY9m4ZPqfk7FdaCz/dv61V6rob7efvPiV/Ns3j7+O8wvNTvCaFN8khV97bZLiP7Mpm5ie1dioFYuX0rhaKuOCkRz2RTBwhWQn/V1t+5mT8iszPxk69Y2VaIHpPiXkGvzS7uQJPy71+K1Q+YVetDZk/Wp/lCc8uT2hLWGfpCJTtX0rFR+fEqdhNFhSQWpeKh1qOTopn8rJMxlNDA6kUp5UarSTSoWZp7G7GVU2P9SyD3DSCpehGnH1Z4ErJbM6XlY425aB73j/kBQYA6fRPU5bkCBQqU8oiaViE5Ji9YwFsqI6MU6qFTgLxFJcwOxv+AxHq4SBil4fG8P7DkJxI1ahTihIoMIyN69LYiLfVaVmpWpSB1iUXz0S5RWVlJbJ8ZVSWS3WdFYUVdK24vKTZqwjN2oWhPnTITEbtiyhcMFH9K9oIdvJDWgL4Udfjw4pfka66dHMG188+LEOt3J/iQFLrfjxr1DFJJeJAlcuDV1OrQsrq9zElIWFlK2jCJ+IbRlp0QwOG0Cj+EldwkbYiAl0QdCIJypEeNdOKR4qrcR5lTz85ilAnXIE9WA3eQpWLMRQ119q/ySboZiwZgG+o6n7r9Uf17LdYEztnloPvHgfW9rMwHNYjCbjPToK3yWd/AC3bYy22kZY8Tg2NraCxcVTYJtIq1GnZgOJtNRQVGCgvwHHUfXM7AJvdIGFtcCRnwTg6oc/4OhVW6R49A5uYHXX7Rb0BYKSrhXnfWetsHJ+sbigu8JagMHyN4sHXnqFnzeUAvoYLdEqGF45ED9uV/7D7bDLaAWN2zKXSVFjl+DXwf7RCtw/qKY5kkHjhaFcDgKxClZXUErj2VqdPpspDg5Ecg3O0UogRsu+l3Zwk3bgQcurD+BPHDKCgVL8+N5juTXU/qZtG2qYukDDB4Fo2hhOdvgf8C2iT5W2tX0kPzSvcQ6qQSWaQ49bwTEkivCwjNhYnAMsb9qBw5AdYH0MGFQHsF8Gg4UR6HXJoqyqkJiwjKwYWq2NyIzV6PCmWpDLY0Bwnc5IK2NwwTjeAw8RG3bjtllgELlNPGfZonfmLmvft4zGryrALlRcL0rBy/WF6LbHFMuLgkggxHmTVkccyKR8YnrpM1YheF8WwUa7q3L8rvQHBX5rTDfo173m1ofd790iVjrgvC8/siy1YX3smqzAtTTulYRWfH3jHe7RhabLchCC1nh4DHfjywb0ZQ8drz9yBh/iFQqlBRcs/T1wOeqluIAQxJV56QV8Xh3hXd7e0RkuwPkzD/6IZq9wRIPXA0k9fk+BSgCV3gWp3QWNFecGKGsUeKE2nVVTqWxWPJOI4a2KM4/qexcUaNCQ8T11/6MTqKu+qniA/21i13tduEhr0JoNduM43A5VthOVcUAr9uCCIvhxnOR3SWm+QaKCiPlu/F1Afkd4uuG3/R6C+thfHnoc78Jr4tEtarVWTUXi6RKVajU/c3uJca2GBwdBNLeKcVsAcJDif1Ws+w4XlnNYEL/SaUUrix1dJx5dvoCD0QoP9MZcyR5UIEesOGsN3845WdtRKd1x7PHmPY/DffzdoBZ4SfEQbgrmHx68dpkc5+cCWQyQ7+FTdMT/D+pIFOt42sWWTWhcVRTHz70v2SRqYwPTYMaSdiLBNGqdUjMjUoxCGsTQoDVS6UKbSluENEMlWbV0U1qKukkEq+DGL6QbFXSVjeDCjVJc2MFVCwpZdWPagorj75x378ubsTPahfXBn//9OPe8c+89H9cNiLh1WU3OypD/QR5yq3KA/iFQS+6VClw0TEtv0iPbfJ8UfU22uQJYl0l/jbExGUpuyCTzRaBrSsxPgVl/hfY507Ef2SF4CJlRP9b4nXX67wld47+RYfoqV2HdEjxlKMgiKGBbBdu2q07T+4eUkN+u8v5TbFm1taP2f51/k7Gy2VhW+3N7OYXM89Fu3Zc7xjj78V4edOVGvXWfKp+8LQ8kE5xRXKf/mpBK2K/qPYAdJdvDGZkDVZ1XW1TG9tiHvXXGFuUo40fj2bCm4s7bv2Zt/+g2nhZh38Po6g9j5fh/WEA/Ovu7umQzcpvpD9C/C+7VcT9nZ6a2jfi9Mog9BtanCPdxp1j9TOTPb9vNRx+MfCu5nA9VOJd5MN7hf8VkjbNfk/FwR09lMupvGz73KnbV8lAf5B/XM78jJhifj/12bPEDJ5+J0/vIr4N/8hdF0LuMTMWwjH8vyxbmDrq3ZCn6dSu7JXmUu3sk+JvaeFJ9JO03ns7k1TcL8gLzlxQWp/h0jJE7zu8Ti6HNPWi8q98W3W/cQU42a38I1MfZj95ZFts6d0Iesxghrv2InmdjOMa1xmps/xMrOJvznNVxsIAPHQcLudjqyKz9CB2n4Tdi7ki5cSPwrznuha8GOd/ETWtlU+wney0n6Lhj7WXO7WHyxo4wPxDWbmLuF7vbXN5qzV3+K+yO7fZ8N7q+Yz/Pscc95lPlMD8jOzXP65wCX/siy4Uaq5rb6FsNwK/JOeP58wr3/a/OVTlZkV0xp/5nHGoV7bNxjL2M5eTGb5Ob9EddSVWeVLh5eEPmuvsa3/5ABmKtbOGi5u2kx810fy6Vrtdlt9UV8oedT1pLqppHrJYck2fBFO1ZkHKovWBfVn/r1IZYb5r5vjbjfcp2p/zLbLjmNE99TJ6qKGLdamWL1XZzP+M7J8hn1N2wpz1a42Kda+V822poLc3ZnOsT7ohs9SfllL4tsOtlRZC9J7ksBeaHb8f3/hfGftvDtJ2J1pnR7E3Vk955Xj7W+o78nulI3wCduN1ceDd04mSnDGLrl1rPtX62wmroLcZzc/sD5rQ+Kke09gOi/PdgRmE1c11eCagFngu1UdsLsRZqW3M+fEHRlMPJbwEXAibTXOi2gD6F+X2wQf0MvpS9JS5aXevmXA6DRe3nP+b2gTFwRO2JNa3rRc6zbjH/WqhNp+UT6kXqC73WDjlfc3yW59ca6/YmjW/POnnonFSD7WeAvp/fAZp/dxMPK+g46H6UrfAgut81ewoWO4f1HY7P/C1PZ+/iGnFIrcnlt414XWZ/7MneQIewQ+vRLnlGYb5col2ydtl3UyeA6cjJuBXGVmz8JXcTvmntSpOe0NZ3b6Z31OZ2+Krx/f5x45G/ACSfrNYAeNqtlk1MlFcUht977wBCqVKEkX8HGGAAgUH8QUstIlKqONIppZYSIwrW4hQJoU2hP2FFujCNMV0Y05guTNOYLowL0ybGGNOF6cK4UNuYLkwXpgtTE6tN46L2ve98GpvSLqQhPOf+nXPud897v29gAOSY3ozzcN09fQMo2DczlUI8NTI9gT6EOIuHD5HtV6EAFYhhDTahF8kn5gyeQSFWoh5r8SJexqtoRtbmoa0R9GxJDkSwe8fOvgjeS/R1R3Ckv297BF8ld+6I4MJAku0bQRSLXIQRQQPWoRPbMBCMOzyLFahEI9ZjM7bjtWA8hKUoQhVWoR1d3OugxnOQgWUoRjWasBobsAU78HrgkYk8lCDK3W1ENxLYFYxn4TmUogYteB5bsRNvBJGWIB9lqEUcbehAD/oxFHhkYznKUYdWvICX8ArexPDISGraNoirxY1il7hNTIpD4l5xXJwaTb39lp0V58R58bB4VDwmnhBPiqfE0/unRvbZs+I58aJ4SbwsXhVviDfFW+JtBhixd8UHns6KOWKeGBYrxJgYF9tTE+++4zaJ3eI2sV8cFIfFveIBcUKcTh3al3Kz4twhPzIvHhaPisfEE+JJ8ZR4Wjwrnpv0vCheEi+LV8Ub4k3xlnhbvCv+Me35p2coJOaIeWJYLBOrxJjYLK6ZHZs6FNoodoo9Yp+YFHeJu8VRcVyc5KWx/Df/ozW8IU9P99S0vCHZC1hD+4iPxhxtDt8T6ZHcBVZnLIL2CYYWwcxFMGsRXPqUXMb3ZYzvp3a+MXv5ftqFPTiASbyPOXyCI2l12DPpmtmLgVoOBE87EfRPB/antDVLAtucXmcGAjsZ2PnAfh7YM4G9EuTrgHXHEbJFttjW2joYd4y1yeGXI0Tm8x1cZX7knvZjg/lB9qDvM5/6tAe5PhNLbXN6lbd+lnEH+S0od8td2BW7MrfSVbkaF3ONrsW1ufyFRukz4H1wDXFXiDZXhHZXig2uAglXiaSLYtTVYcw1YNwxs2vFDH2SKHCFrsiVugpX6aKuzjW4Ztf6Lxn6+W1scysYuYSRyxk5wsjVjFzLyPWM3MTIccy4NTyNhDTvb0Qev3gfsrWe1ZvlM6/Hx2Qv18R1YgVS5kdsd6n1QbrFLI9nzRjbW9Taz1Y3z//ef/na65ot0wnnpuftp2TP31Zd4Kz/+jXzO7kH44p/l3NNaT+zirbD09zXk7CqppT+nf7PreIYrfFZOgOPO/K4Iw8f7bfHLe7X/M6cw/ZbWDvMt4KvcP5j/bBynB2i0gcxjL3U7wSmeV5zmMdhfIbj+AJf4mucwTc4j+/wPa7gOtX8M37Br7iHBwYm0+SafFNkKkzUNJi4WWc6TBcrF6YmLGtaRJZRF5a1rSCrqA3LGkfJGPVhWesGsoUacdRaq1vtveGrX8jKW9Y/7CPxLlrqxleonT1GlW5LqQpLbZT5DDxTS11FOJJgj9n4e8pSZ9UcSbLHzBglo9SPpYpq/C7ASlOH9RwZY487Yl0sdelrMs4ed+dvDnXq1XOQPUt1ejW3UneW6mvz522X2wIbtTV6YyZVW38//K+cdu41wbFR5hpnrBlcW+gWpD143/w9XMHTK+HZlfPkIjy3ap5aLc+snifWxPOK87Soen9D/hmf3iX0jNCrlh5NXK21zBpm3mJmLmPulcxexfw13EGMe2jkLlr4VP55DG+N0d2Zld0svWdSqWupvWFz32uLfzP8z9ZzXnt0Av4JdBva+AftznB/Cao3qV+4fp8Z2mkW/WeQzX01Iof7bEWlnqv2L2avj2gAeNrtXWt4lEWWPlWdgAHkZgCF6EbMchXkZgiBAQQkGJIQQmQYDCAyYCAQINDcWcJNLjoLMQMqw6igRkQKEZBdmcDiZbBBbgJPfqD7yM6UzjxPu+4+gICo9L5VXc1+aZKQDmk22ad+vHW6v+7++uvznnrPOaG+ghgR1aNjvDW5Bg1OyaToCfPzplLc1PGzc6kHReBV8vnIpd8V7XjOqD41o85U97HRj8dS4sCMzFganDosJZYy0lIGxdLY9JShsTQlY1hqLM3JzMDjZeaTnBpQc/PYRXdTC/M4ghrSveZxJDWi+8zjOtSYWprHdakJtTKP76KmFGMeR9E9dD89MGHGrBm0T4/FevxYjx49ntDjWT2e0+N5PX6rx+9yJubl0gU9XtXjdTWyCD3W02NjPTbXY4weW+ux3azJCyayznrspsd4PSbqsa8eB+hxsB6T9Zimxww4VHFQ9ZFVbSw8SFS4H9gH7AZ2AtuBImAr8CqwCe/lYKCh+VRjPFO2KT6/FizVVa9s6KDj4jh7M4JHDImcFDmvTtM690Y1j+oflRZ1NupcvfX1x9Z/s0GHBrvuTm6Y3aik8aUmdZrmR3/fLK5Z4r197hsb8/T9yx6Ijc19MP/B7XF3xaW12dHmQrsu7Ua3f7n9xx2pY4eHsx9+sdOpTte6jOryatevutXpPqh7bo8dPUrio+P79lzUs6hXVq+NiWcTr/8q61db+57vV6//of7XBuwaWG/QoUHXkkYlvZq0K+njpLNJ3yZdHTJyyOYn4p94/YnryQ2SWya3S45PHpSckZyVfHjokKH7h15K6ZwyO2VnyqGUw6ldUjelRaTlDrsrvU36iuEDhn+VcW1EduYDmS88OeDJXSMnjTz767W/vjpq528a/Obo6ITR3z+1OqtoTPSYo2MTxn4/Luvppk/nj48f/+Yzo5/xTPinCd/9dutEmnhwUsykc88mPHs5O3Ny08k7phzNOZbzl5yrUxtOjZs2JXfz9BMzKa9oVvTs/bPl7Gvuxu427j7uAe5R7rHu2e617tfd+9zH5p6eN2PBnIXRi1su/tclB/Ozlm1fXrwybeVXq3JX/bwmY23MC1N+t+ifT6/bvP5CQXHBXwr+u7BvYXrhM4Uz6CXq4JPUEXgE6AYkAunAcGA08BSQ7RM0GXYqMA2Y7iugGcBMIA+vuYE5gAevHQGOAceBE8BJ4BTwBXAaOAN8A/wN+An4BfD5JGOAC4gE6gJRQH2gEdAEuAdoBrQAWgKxQFugPdAF6A48CvQEegG9gbeAIuBtYBvwLrADEMBO4D1gF/A+sBvYA+wFPgD2AR8C+4E/AcXAAeAgcAj4CPgE+BT4M3AY+AyADxh8wI4CnwPwBYMvGHzB4AsGXzD4gsEXDL5gZ4FzwJfA18B54K+A9Ene2if4Q7BtYPFbeQKA38bBEcfv432BfsAAYCCQDKQAqUAakAWMAcYC44CJwCQgGwCffAqQA0z1FfBp+I5c2Omw4JbPhM2DnQULbvlcYB4wH1gALAQWAYuBJUA+sBRYBiwHViAemtAgKPEMMJwHzMGvyqMYfJPEt0h8g8TZJc4scVaJM0qcTeJMEmeROIPk3+HzSdQR4yNAN0CdcTjwlOPMs/1npyM4dhw4CXwBnAG+Af4G/AT8AvgohjHABUQCdYEooD7QCGgC3AM0A1oALYFYoD2Aq2dFwDZgB7AT2AXsBvYC+4D9QDFwEPgI+BQ4DHiAo8Ax4ARwCjgNnAW+BM4DsgreiSBEAA2Gb4cAbjxuQ630HJWYn5JwDlJHlwBLgeXASmAVsAZ4HlgHFACFwAbgJeAV4DVgC/AGgDlE7wCYP4T5QpgrVKxjRyJuJGJGIl4kYkUiTiRiRCI+JGJDIi4kV9/LcFWC/g3XV0AxeOTXHgHtEdAeobWnN+xQIBXw65CgTEBp0dOwzwCIVXAvtPYo3UFc4vcVUL7Pg99YQMt8XvzOAlIxuBL2OdhVsKth18CuhX0e9gXYdbDr8f4C2BfxvBD297AbYDfCvgT7MuwrsJtgX4N9He/fArsVz98A3gTexvNtOP4O7HY83wEr8Px92N14vgd2L54Xwx6A9Wulx2il12ilMFrpNVrphVZ6oZUCWumBVnqhlV5opRdaKaCVAlopoJUCWimglV5opRdaKaCVXmilgFZ6oZUCOim0Tnb1ebRW9sBxpZfxsEozE2CVbibifUo7++D5Rrx3E+xmHNsK69dTj9FTr9FTr9FTYfRUGD0VRk+F0VNh9NRr9FRAT4XRUq/RUmG0VBgtFUZLhdFSYbRUGC0VRku9Rku9RkuF0VJhtNTLfsR1/wx7HdrU2OfhTX1eHo3HLWDvg+2FY73xuB8wEEAMQke9fBjsGNhxwCQ8ngybA0zD+6fDzgRmAXPxfD7sQmCx1kOv1kLEIH8Or63G87Xgrx5BSehRYCSQhVl/EbgE/ABchgIoXMFrLqV1WjHVPH+QkAl0FvZnYKHVb6aeBVr9dKZoazJEb5MZVFYYajLCMJMNxpksMNmofwiKgxn8GK6lk565iY4qYYa5Do/J/idM1j9dQXYuMll5h8nGu0wW3muy736TdQ+abPupybIek12Pmax6ymTTsyaLnjfZM+h3UXdd53QzV608qLx3xNQqJ02NcqYa6pL24f91yK2qKptuqjBUYLpaUJWCyuYqk6ssrjL4HJO5F5iMvcRkamTpGhJVNeMqam7etBVQRRXQU+BNoJ6Q1EnXEf75PUrXBAI1geJPoCZQHApaoXkUqAkUlwI1geJToCZQnArUBIpXgZpAcStQEyh+BWoCxbFATaB4FqgJFNcCNYHiW6AmUJwL1ATS1ASKe4GaQPEvUBOoGBCoCVQcCNQEKhYEagIVDwI1Qe3QHRuLFVbj7KLPzS4BPwCXfW4aeyNXpptcWXY3LU03LU03HVoufct0ue+a7vY909XuMd3sh6aLPWC6109M1/qZ6VY/N13qSdOdnjFd6df+bvQOd6LSdKLSdKLSdKLSdKLSdKLSdKLyRl7L16rpz21/MLogSvUYvU1vEegryuopZhsG5t3QEI/REK/REGE0RBgNEUZDhNEQYTTEazREGA0RRkOE0RBhNEQYDfEaDVF9RYHpK4TpK4TpK4TpK4TpK4TpK4TuK1RPofoJ1UuoPsLZQ1ytpj5C9RCqf1C9g+obVM9QVr+gegXVJ6geQfUHqjdQfYHqCVQ/oHoBfx+g9EjoPkD1AKr+V7W/qvtVza/qfVXrqzpf1fiqvle1/Z2p672ItB8RZT+aGf/jjRnvrOvvvlGrhFJzRKpP3VSpHroDHbIMsUOWIXbI0tEhFzg6ZBnUIcugDlmaDlkGdcgyqEMO/mtiILKd2bOsyA5kT2GypzDZs6wOWZoOWZoOWQZ1yNJEvDQRL4M65OC/OFa2Q5aODtk/M0r/xbGqXXLwXxyDu2RpZpN0zCZpZpN0zCZn/S1M/S0c9bdw1N+eoLngccwFYeaCs0uWXFViQxD9nlL9morcZcAKAO9EpHoQpR5EqAfR6UFkehCVHkSkB9HoQSR6EIUeRKBH12LbYLcDAtgN7AUOALW1/7MaYTXCaoQM0gipo1ZlVtXfqd5OvVP1dCo6VS+n+jjVw6n+TfVuKgpVz+bXCKn7NBVxqj9TkXbA/JtWbdSItjf1HjWop6DC26rPb67NZYi1uQyxNpfl1OYyqDaXQbX5//b3/tpcmtq8tDJdrSZ18tfmfkVKMEpUlgr5a/NA7JVVm8ug2lzeojYPxF+gNg+/UjjVYFCZfwEKlyLUhtlf+X9psKsA7CqAmr4KwMaojdGaHqPDQo7R8uLTxFy5seaMsfaO+Ak1bgLxcrtxEoiDBAe3aYa3ACe34qBeMAfa39bP1s/Wz9bP1s+1x8+2VrO1mq3VrBZYP1s/Wz9bP1s/11w/T6tRtVqgLmsWVI+FWosFaqzg2ipcNVKgPgp3bWT4poYh10D5dl7ZHsj2QLYHsjnW5libY8OaYy3ftZHv5tTb3NGSGcR7V4phPYB4IAFIBPqYezNtPNj5H8y3rf1s7VfTa7+b942oriMtKryPdp25PzZwb2wo98Uu0fc9P4SrjwP6AYOBIVBiBTcwF1gALCpjtVsnx4q3mnuvb8tS90I7q8vy7oFOrcK9z/lh56n07gXV84zr9Z1qXeed81Jste91sN+xprMy+xbElFrjXpm16GVl+BCuAJmvKnsLLNE5M1vHVAk+WaLiCZ9USqvipQSfLMEnS/DJkjDN66pfeUTwJ4mps9/BSLPfdDvfZHdvqJ13zIc3Cz0SFt8H/NzM4d9g3+53+DBUPwX6CBvTtTOmW1Ubb1scfBUbToK56FRpLozPy/W108ftjV/L82lxJXypfDfX+sj6yPrI+qiG+8jWIeXXITZ+bh0/tlaztZrNH9ZH1kfWR9ZH1kfWR7bmr801v/WN9Y31jf17vu0RY6i/XgPQiUb491aEHQQE9lTzr9sSZr96j3/dFiWUuz6gK43w7x0Iq/cOhNV7B8LqvQNh9d6BsHmAcx+2Dx37rZWxpxq7gPdfoRHgXujdsnJhp8Pi+vBrPYgDgV/s8a89ogT/2iNYvfYIVq85gi3BOb4DLtIIVzR+aySN8rnZRUpgP+hXE/hl/EL/0Us4etkcvaKPPooRr1AWXrl4473Oo5fMe4ffWF3xf+nVMOxup5ioMgt6BZiDDb0CDFavACuDnZQ7vsf4LeLwDq3tDH2fcLNHuPWY9VjYPTY5LPvPB/aVD+wXH7xPfHXvDx/YC17tAx/YA74q+7+rvd6d+7xXx17uah/3UPdwV/u3O/dtb1XWurMbK2sru/7sVtVfYH2ajYnaEBP1KrWXf365+/ff/lGmryD018J1dOkd2W08sIt4YHfw4F3Bw70b+M3rZsO323fpu2fELe6euf1duEuvq6zc7tv5QXvsti13x+31Zt/cwJ65VdlB+3ZXLdsYtTFqY9TGqI1RG6M2Rv9/x6j9vyPs/x1h/++I8P3fEb+t9vkVmDeB+RA8D6o7/svS96rEt1O3S6tR1WO1svrsjNGHKozRW2lydeuvjQ8bHxXFx5PVFB/CxIcIMT+LSufnQF72x5m4kY/9cSUc8SPgGVFmXvXnU6HzqcqjRQDitczcWKzjRFSYD6WOCWFymtA5LUf5sNry1FZHfjoQ4t5dRRXkneJK5Btbv9n6zdZv4a3frP5a/a1If2182PioKD6iqD/FsAtl/Gv3RcduKy7Xg74vXXE+j6uz7z9pRI1ZJRem9Vy3tbIu1DVdETettou4aaWdi38D/7fy7XO1hf+ZK8a3D50ZY0TjKJcYnaFW1Jo6UGfqSvGUSH3pMRpIj1MSJVMKpeNbRuOd4ymbptJ0mkmzyE1zaQktpeW0klbRGnqe1lEBqrUN9BK9Qn+k12gLvUFv0dv0Du2g92kPfUDF5KFjdIJO0WmS9C39nS7QNfqZrjNinEWwOuwuVo81YA1ZY9aURbPm7D52P/sH1pq1Ye1YF9adPcp6sl6sNxvIHmdJ7Ak2lKWzDDaSjWKj2Tg2nk1gE9mzLIflsplsNpvD5rOFbDFbwpayVex3bAN7hf2B/ZG9xrawt9jb7F0m2HvsfbaHfcD+hX3I/sQOsEPsE/Zn9hk7wj5nx9lJ9gU7w86xr9l/sL+yq+wn9gvzccZdPJI34k34Pbw5v5e35K15HG/D2/OHeQ+ewBN5X96fD+DJPIWn8XSewTP5SD6Kj+ZZfCyfyLP5FD6V5/IZPI/P4fP4Ar6IL+FL+XK+kq/ia/jz/CT/d/41/zv38v9yuVyRrrquKNfdroZg6jiYikEP1xFcdQNXPTF/+oGtx2kw2BpKqWBrOPjKpFFgLJsm0zQwNgOc5WnW5tAC8JYP5paBuxVg7znwtxoMrgWHL4DF9eDxRTD5e3C5EWy+DD43gc/XwehW8LkNjG4HpwKs7gave8HrATqCKztJXyCSUK3St+wBcNaV9WDxLIElsj6sPxsCRtyakwVgZRVbzTayTWwz2wouisDGNvCxA4zsBCe7wMpu8LIXzOwDM/vBTTG4+QjsfAp+DoMhDzg6CpaOgacTYOoUuDoNts6Cry/B2HkwhtnILrJL7Ad2mV3x8weuHgJXbXkv3pv34wP5UJ7Kh/ExfByfxCfzHDAzDdxMBzszwc8sMDQXHM0HSwvB02IwlQ+uloGtFbyEf8Mv8sv8iivO9Y//AwtHo/gAAAA=) format('woff2');\n}\n\n@font-face {\n\tfont-family: 'Latin Modern Roman';\n\tfont-weight: bold;\n\tfont-style: normal;\n    src: url(data:application/font-woff2;charset=utf-8;base64,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) format('woff2');\n}\n\n@font-face {\n\tfont-family: 'Latin Modern Roman';\n\tfont-weight: normal;\n\tfont-style: italic;\n    src: url(data:application/font-woff2;charset=utf-8;base64,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) format('woff2');\n}\n\n@font-face {\n\tfont-family: 'Latin Modern Roman';\n\tfont-weight: bold;\n\tfont-style: italic;\n    src: url(data:application/font-woff2;charset=utf-8;base64,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) format('woff2');\n}\n\n/* Page Layout */\n\nbody {\n  background-color: white;\n  font-size: 13pt;\n}\n\nbody {\n\tfont-family: 'Latin Modern Roman', serif;\n\tcounter-reset: theorem;\n\tcounter-reset: definition;\n}\n\nhtml {\n  font-size: 14px;\n\tline-height: 1.6em;\n  /* font-family: \"Libre Franklin\", \"Helvetica Neue\", sans-serif; */\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, \"Fira Sans\", \"Droid Sans\", \"Helvetica Neue\", Arial, sans-serif;\n  /*, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\";*/\n  text-size-adjust: 100%;\n  -ms-text-size-adjust: 100%;\n  -webkit-text-size-adjust: 100%;\n}\n\n@media(min-width: 768px) {\n  html {\n    font-size: 16px;\n  }\n}\n\nbody {\n  margin: 0;\n  text-align: justify;\n  -moz-hyphens: auto;\n  -webkit-hyphens: auto;\n  hyphens: auto;\n}\n\na {\n  color: #004276;\n}\n\nfigure {\n  margin: 0;\n}\n\ntable {\n\tborder-collapse: collapse;\n\tborder-spacing: 0;\n}\n\ntable th {\n\ttext-align: left;\n}\n\ntable thead {\n  border-bottom: 1px solid rgba(0, 0, 0, 0.05);\n}\n\ntable thead th {\n  padding-bottom: 0.5em;\n}\n\ntable tbody :first-child td {\n  padding-top: 0.5em;\n}\n\npre {\n  overflow: auto;\n  max-width: 100%;\n}\n\np {\n  margin-top: 0;\n  margin-bottom: 1em;\n}\n\nsup, sub {\n  vertical-align: baseline;\n  position: relative;\n  top: -0.4em;\n  line-height: 1em;\n}\n\nsub {\n  top: 0.4em;\n}\n\n.kicker,\n.marker {\n  font-size: 15px;\n  font-weight: 600;\n  color: rgba(0, 0, 0, 0.5);\n}\n\n\n/* Headline */\n\n@media(min-width: 1024px) {\n  d-title h1 span {\n    display: block;\n  }\n}\n\n/* Figure */\n\nfigure {\n  position: relative;\n  margin-bottom: 2.5em;\n  margin-top: 1.5em;\n}\n\nfigcaption+figure {\n\n}\n\nfigure img {\n  width: 100%;\n}\n\nfigure svg text,\nfigure svg tspan {\n}\n\nfigcaption,\n.figcaption {\n  color: rgba(0, 0, 0, 0.6);\n  font-size: 12px;\n  line-height: 1.5em;\n}\n\n@media(min-width: 1024px) {\nfigcaption,\n.figcaption {\n    font-size: 13px;\n  }\n}\n\nfigure.external img {\n  background: white;\n  border: 1px solid rgba(0, 0, 0, 0.1);\n  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.1);\n  padding: 18px;\n  box-sizing: border-box;\n}\n\nfigcaption a {\n  color: rgba(0, 0, 0, 0.6);\n}\n\nfigcaption b,\nfigcaption strong, {\n  font-weight: 600;\n  color: rgba(0, 0, 0, 1.0);\n}\n";

  var layout = "/*\n * Copyright 2018 The Distill Template Authors\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *      http://www.apache.org/licenses/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n */\n\n@supports not (display: grid) {\n  .base-grid,\n  distill-header,\n  d-title,\n  d-abstract,\n  article,\n  d-appendix,\n  distill-appendix,\n  d-byline,\n  d-footnote-list,\n  d-citation-list,\n  distill-footer {\n    display: block;\n    padding: 8px;\n  }\n}\n\n.base-grid,\ndistill-header,\nd-title,\nd-abstract,\narticle,\nd-appendix,\ndistill-appendix,\nd-byline,\nd-footnote-list,\nd-citation-list,\ndistill-footer {\n  display: grid;\n  justify-items: stretch;\n  grid-template-columns: [screen-start] 8px [page-start kicker-start text-start gutter-start middle-start] 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr [text-end page-end gutter-end kicker-end middle-end] 8px [screen-end];\n  grid-column-gap: 8px;\n}\n\n.grid {\n  display: grid;\n  grid-column-gap: 8px;\n}\n\n@media(min-width: 768px) {\n  .base-grid,\n  distill-header,\n  d-title,\n  d-abstract,\n  article,\n  d-appendix,\n  distill-appendix,\n  d-byline,\n  d-footnote-list,\n  d-citation-list,\n  distill-footer {\n    grid-template-columns: [screen-start] 1fr [page-start kicker-start middle-start text-start] 45px 45px 45px 45px 45px 45px 45px 45px [ kicker-end text-end gutter-start] 45px [middle-end] 45px [page-end gutter-end] 1fr [screen-end];\n    grid-column-gap: 16px;\n  }\n\n  .grid {\n    grid-column-gap: 16px;\n  }\n}\n\n@media(min-width: 1000px) {\n  .base-grid,\n  distill-header,\n  d-title,\n  d-abstract,\n  article,\n  d-appendix,\n  distill-appendix,\n  d-byline,\n  d-footnote-list,\n  d-citation-list,\n  distill-footer {\n    grid-template-columns: [screen-start] 1fr [page-start kicker-start] 50px [middle-start] 50px [text-start kicker-end] 50px 50px 50px 50px 50px 50px 50px 50px [text-end gutter-start] 50px [middle-end] 50px [page-end gutter-end] 1fr [screen-end];\n    grid-column-gap: 16px;\n  }\n\n  .grid {\n    grid-column-gap: 16px;\n  }\n}\n\n@media(min-width: 1180px) {\n  .base-grid,\n  distill-header,\n  d-title,\n  d-abstract,\n  article,\n  d-appendix,\n  distill-appendix,\n  d-byline,\n  d-footnote-list,\n  d-citation-list,\n  distill-footer {\n    grid-template-columns: [screen-start] 1fr [page-start kicker-start] 60px [middle-start] 60px [text-start kicker-end] 60px 60px 60px 60px 60px 60px 60px 60px [text-end gutter-start] 60px [middle-end] 60px [page-end gutter-end] 1fr [screen-end];\n    grid-column-gap: 32px;\n  }\n\n  .grid {\n    grid-column-gap: 32px;\n  }\n}\n\n\n\n\n.base-grid {\n  grid-column: screen;\n}\n\n/* .l-body,\narticle > *  {\n  grid-column: text;\n}\n\n.l-page,\nd-title > *,\nd-figure {\n  grid-column: page;\n} */\n\n.l-gutter {\n  grid-column: gutter;\n}\n\n.l-text,\n.l-body {\n  grid-column: text;\n}\n\n.l-page {\n  grid-column: page;\n}\n\n.l-body-outset {\n  grid-column: middle;\n}\n\n.l-page-outset {\n  grid-column: page;\n}\n\n.l-screen {\n  grid-column: screen;\n}\n\n.l-screen-inset {\n  grid-column: screen;\n  padding-left: 16px;\n  padding-left: 16px;\n}\n\n\n/* Aside */\n\narticle aside {\n  grid-column: gutter;\n  font-size: 12px;\n  line-height: 1.6em;\n  color: rgba(0, 0, 0, 0.6)\n}\n\n@media(min-width: 768px) {\n  aside {\n    grid-column: gutter;\n  }\n\n  .side {\n    grid-column: gutter;\n  }\n}\n";

  var print = "/*\n * Copyright 2018 The Distill Template Authors\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *      http://www.apache.org/licenses/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n */\n\n@media print {\n\n  @page {\n    size: 8in 11in;\n    @bottom-right {\n      content: counter(page) \" of \" counter(pages);\n    }\n  }\n\n  html {\n    /* no general margins -- CSS Grid takes care of those */\n  }\n\n  p, code {\n    page-break-inside: avoid;\n  }\n\n  h2, h3 {\n    page-break-after: avoid;\n  }\n\n  d-header {\n    visibility: hidden;\n  }\n\n  d-footer {\n    display: none!important;\n  }\n\n}\n";

  var byline = "/*\n * Copyright 2018 The Distill Template Authors\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *      http://www.apache.org/licenses/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n */\n\nd-byline {\n  contain: style;\n  overflow: hidden;\n  /* border-top: 1px solid rgba(0, 0, 0, 0.1); */\n  font-size: 1.2rem;\n  line-height: 1.8em;\n  padding: 1.5rem 0;\n  min-height: 1.8em;\n}\n\n\nd-byline .byline {\n  /* grid-template-columns: 1fr 1fr; */\n  grid-column: text;\n}\n\n@media(min-width: 768px) {\n  d-byline .byline {\n    /* grid-template-columns: 1fr 1fr 1fr 1fr; */\n  }\n}\n\nd-byline .authors-affiliations {\n  grid-column-end: span 2;\n  grid-template-columns: 1fr 1fr;\n  margin-bottom: 1em;\n}\n\n@media(min-width: 768px) {\n  d-byline .authors-affiliations {\n    grid-template-columns: 1fr 1fr 1fr;\n    margin-bottom: 0;\n  }\n}\n\nd-byline h3 {\n  font-size: 0.6rem;\n  font-weight: 400;\n  color: rgba(0, 0, 0, 0.5);\n  margin: 0;\n  text-transform: uppercase;\n}\n\nd-byline p {\n  margin: 0;\n}\n\nd-byline a,\narticle d-byline a {\n  color: rgba(0, 0, 0, 0.8);\n  text-decoration: none;\n  border-bottom: none;\n}\n\narticle d-byline a:hover {\n  text-decoration: underline;\n  border-bottom: none;\n}\n\nd-byline p.author-name {\n  font-weight: bold;\n}\n\nd-byline .affiliations {\n\n}\n";

  var article = "/*\n * Copyright 2018 The Distill Template Authors\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *      http://www.apache.org/licenses/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n */\n\narticle {\n  contain: layout style;\n  overflow-x: hidden;\n  font-size: 1.2rem;\n  line-height: 1.8rem;\n  /* border-top: 1px solid rgba(0, 0, 0, 0.1); */\n  /* padding-top: 2rem; */\n  /* color: rgba(0, 0, 0, 0.8); */\n}\n\narticle > * {\n  grid-column: text;\n}\n\n/*\n@media(min-width: 768px) {\n  article {\n    font-size: 1.3rem;\n  }\n}\n\n@media(min-width: 1024px) {\n  article {\n    font-size: 1.2rem;\n    line-height: 1.7em;\n  }\n}\n*/\n\n\n/* h1 */\n\n\narticle .marker {\n  text-decoration: none;\n  border: none;\n  counter-reset: section;\n  grid-column: kicker;\n  line-height: 1.7em;\n}\n\narticle .marker:hover {\n  border: none;\n}\n\narticle .marker span {\n  padding: 0 3px 4px;\n  border-bottom: 1px solid rgba(0, 0, 0, 0.2);\n  position: relative;\n  top: 4px;\n}\n\narticle .marker:hover span {\n  color: rgba(0, 0, 0, 0.7);\n  border-bottom: 1px solid rgba(0, 0, 0, 0.7);\n}\n\narticle h1 {\n  counter-increment: h-one;\n  counter-reset: h-two;\n  font-weight: 600;\n  font-size: 1.8rem;\n  font-variant: small-caps;\n  line-height: 1.25em;\n  margin: 2rem 0 0.1rem 0;\n  /* border-bottom: 1px solid rgba(0, 0, 0, 0.1); */\n  padding-bottom: 1rem;\n}\n\narticle h1::before {\n  content: counter(h-one) \"\\0000a0\\0000a0\";\n}\n\n/* h2 */\n\narticle h2 {\n  counter-increment: h-two;\n  font-weight: 700;\n  font-size: 18px;\n  font-variant: small-caps;\n  line-height: 1.4em;\n  margin-bottom: 0.5em;\n  margin-top: 2em;\n}\n\narticle h2::before {\n  content: counter(h-one) \".\" counter(h-two) \"\\0000a0\\0000a0\";\n}\n\n@media(min-width: 1024px) {\n  article h2 {\n    font-size: 20px;\n  }\n}\n\n/* H4 */\n\narticle h4 {\n  font-weight: 600;\n  text-transform: uppercase;\n  font-size: 14px;\n  line-height: 1.4em;\n}\n\narticle a {\n  color: inherit;\n}\n\narticle p,\narticle ul,\narticle ol,\narticle blockquote {\n  margin-top: 0;\n  margin-bottom: 0.5rem;\n  margin-left: 0;\n  margin-right: 0;\n}\n\n/* p's that follow p's are indented */\narticle p + p {\n  text-indent: 1rem;\n}\n\narticle blockquote {\n  border-left: 2px solid rgba(0, 0, 0, 0.2);\n  padding-left: 2rem;\n  font-style: italic;\n  color: rgba(0, 0, 0, 0.6);\n}\n\narticle a {\n  border-bottom: 1px solid rgba(0, 0, 0, 0.4);\n  text-decoration: none;\n}\n\narticle a:hover {\n  border-bottom: 1px solid rgba(0, 0, 0, 0.8);\n}\n\narticle .link {\n  text-decoration: underline;\n  cursor: pointer;\n}\n\narticle ul,\narticle ol {\n  padding-left: 24px;\n}\n\narticle li {\n  margin-bottom: 0.0rem;\n  margin-left: 0;\n  padding-left: 0;\n}\n\narticle li:last-child {\n  margin-bottom: 0;\n}\n\narticle pre {\n  font-size: 14px;\n  margin-bottom: 20px;\n}\n\narticle hr {\n  grid-column: screen;\n  width: 100%;\n  border: none;\n  border-bottom: 1px solid rgba(0, 0, 0, 0.1);\n  margin-top: 60px;\n  margin-bottom: 60px;\n}\n\narticle section {\n  margin-top: 60px;\n  margin-bottom: 60px;\n}\n\narticle span.equation-mimic {\n  font-family: georgia;\n  font-size: 115%;\n  font-style: italic;\n}\n\narticle > d-code,\narticle section > d-code  {\n  display: block;\n}\n\narticle > d-math[block],\narticle section > d-math[block]  {\n  display: block;\n}\n\n@media (max-width: 768px) {\n  article > d-code,\n  article section > d-code,\n  article > d-math[block],\n  article section > d-math[block] {\n      overflow-x: scroll;\n      -ms-overflow-style: none;  // IE 10+\n      overflow: -moz-scrollbars-none;  // Firefox\n  }\n\n  article > d-code::-webkit-scrollbar,\n  article section > d-code::-webkit-scrollbar,\n  article > d-math[block]::-webkit-scrollbar,\n  article section > d-math[block]::-webkit-scrollbar {\n    display: none;  // Safari and Chrome\n  }\n}\n\narticle .citation {\n  color: #668;\n  cursor: pointer;\n}\n\nd-include {\n  width: auto;\n  display: block;\n}\n\nd-figure {\n  contain: layout style;\n}\n\n/* KaTeX */\n\n.katex, .katex-prerendered {\n  contain: style;\n  display: inline-block;\n}\n\n/* Tables */\n\narticle table {\n  border-collapse: collapse;\n  margin-bottom: 1.5rem;\n  border-bottom: 1px solid rgba(0, 0, 0, 0.2);\n}\n\narticle table th {\n  border-bottom: 1px solid rgba(0, 0, 0, 0.2);\n}\n\narticle table td {\n  border-bottom: 1px solid rgba(0, 0, 0, 0.05);\n}\n\narticle table tr:last-of-type td {\n  border-bottom: none;\n}\n\narticle table th,\narticle table td {\n  font-size: 15px;\n  padding: 2px 8px;\n}\n\narticle table tbody :first-child td {\n  padding-top: 2px;\n}\n";

  var title = "/*\n * Copyright 2018 The Distill Template Authors\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *      http://www.apache.org/licenses/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n */\n\nd-title {\n  padding: 2rem 0 1.5rem;\n  contain: layout style;\n  overflow-x: hidden;\n}\n\n@media(min-width: 768px) {\n  d-title {\n    padding: 4rem 0 1.5rem;\n  }\n}\n\nd-title h1 {\n  grid-column: text;\n  font-size: 2rem;\n  font-weight: 700;\n  line-height: 1.1em;\n  margin: 0 0 0.5rem;\n  text-align: center;\n}\n\n@media(min-width: 768px) {\n  d-title h1 {\n    font-size: 2.7rem;\n  }\n}\n\nd-title p {\n  font-weight: 300;\n  font-size: 1.2rem;\n  line-height: 1.55em;\n  grid-column: text;\n}\n\nd-title .status {\n  margin-top: 0px;\n  font-size: 12px;\n  color: #009688;\n  opacity: 0.8;\n  grid-column: kicker;\n}\n\nd-title .status span {\n  line-height: 1;\n  display: inline-block;\n  padding: 6px 0;\n  border-bottom: 1px solid #80cbc4;\n  font-size: 11px;\n  text-transform: uppercase;\n}\n";

  // Copyright 2018 The Distill Template Authors

  const styles = base + layout + title + byline + article + math + print;

  function makeStyleTag(dom) {

    const styleTagId = 'distill-prerendered-styles';
    const prerenderedTag = dom.getElementById(styleTagId);
    if (!prerenderedTag) {
      const styleTag = dom.createElement('style');
      styleTag.id = styleTagId;
      styleTag.type = 'text/css';
      const cssTextTag = dom.createTextNode(styles);
      styleTag.appendChild(cssTextTag);
      const firstScriptTag = dom.head.querySelector('script');
      dom.head.insertBefore(styleTag, firstScriptTag);
    }

  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  function addPolyfill(polyfill, polyfillLoadedCallback) {
    console.debug('Runlevel 0: Polyfill required: ' + polyfill.name);
    const script = document.createElement('script');
    script.src = polyfill.url;
    script.async = false;
    if (polyfillLoadedCallback) {
      script.onload = function() { polyfillLoadedCallback(polyfill); };
    }
    script.onerror = function() {
      new Error('Runlevel 0: Polyfills failed to load script ' + polyfill.name);
    };
    document.head.appendChild(script);
  }

  const polyfills = [
    {
      name: 'WebComponents',
      support: function() {
        return 'customElements' in window &&
               'attachShadow' in Element.prototype &&
               'getRootNode' in Element.prototype &&
               'content' in document.createElement('template') &&
               'Promise' in window &&
               'from' in Array;
      },
      url: 'https://distill.pub/third-party/polyfills/webcomponents-lite.js'
    }, {
      name: 'IntersectionObserver',
      support: function() {
        return 'IntersectionObserver' in window &&
               'IntersectionObserverEntry' in window;
      },
      url: 'https://distill.pub/third-party/polyfills/intersection-observer.js'
    },
  ];

  class Polyfills {

    static browserSupportsAllFeatures() {
      return polyfills.every((poly) => poly.support());
    }

    static load(callback) {
      // Define an intermediate callback that checks if all is loaded.
      const polyfillLoaded = function(polyfill) {
        polyfill.loaded = true;
        console.debug('Runlevel 0: Polyfill has finished loading: ' + polyfill.name);
        // console.debug(window[polyfill.name]);
        if (Polyfills.neededPolyfills.every((poly) => poly.loaded)) {
          console.debug('Runlevel 0: All required polyfills have finished loading.');
          console.debug('Runlevel 0->1.');
          window.distillRunlevel = 1;
          callback();
        }
      };
      // Add polyfill script tags
      for (const polyfill of Polyfills.neededPolyfills) {
        addPolyfill(polyfill, polyfillLoaded);
      }
    }

    static get neededPolyfills() {
      if (!Polyfills._neededPolyfills) {
        Polyfills._neededPolyfills = polyfills.filter((poly) => !poly.support());
      }
      return Polyfills._neededPolyfills;
    }
  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // const marginSmall = 16;
  // const marginLarge = 3 * marginSmall;
  // const margin = marginSmall + marginLarge;
  // const gutter = marginSmall;
  // const outsetAmount = margin / 2;
  // const numCols = 4;
  // const numGutters = numCols - 1;
  // const columnWidth = (768 - 2 * marginLarge - numGutters * gutter) / numCols;
  //
  // const screenwidth = 768;
  // const pageWidth = screenwidth - 2 * marginLarge;
  // const bodyWidth = pageWidth - columnWidth - gutter;

  function body(selector) {
    return `${selector} {
      grid-column: left / text;
    }
  `;
  }

  // Copyright 2018 The Distill Template Authors

  const T$1 = Template('d-abstract', `
<style>
  :host {
    font-size: 1.25rem;
    line-height: 1.6em;
    /* color: rgba(0, 0, 0, 0.7); */
    /* -webkit-font-smoothing: antialiased; */
  }

  :host h3 {
    grid-column: text;
    text-align: center;
    margin-bottom: 0.5rem;
    font-variant: small-caps;
  }

  ::slotted(p) {
    margin-top: 0;
    margin-bottom: 1em;
    grid-column: text;
    padding-left: 4rem;
    padding-right: 4rem;
  }
  ${body('d-abstract')}
</style>

<h3 class="abstract">Abstract</h3>
<slot></slot>
`);

  class Abstract extends T$1(HTMLElement) {

  }

  // Copyright 2018 The Distill Template Authors

  const T$2 = Template('d-appendix', `
<style>

d-appendix {
  contain: layout style;
  font-size: 0.8em;
  line-height: 1.7em;
  margin-top: 60px;
  margin-bottom: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  color: rgba(0,0,0,0.5);
  padding-top: 60px;
  padding-bottom: 48px;
}

d-appendix h3 {
  grid-column: page-start / text-start;
  font-size: 15px;
  font-weight: 500;
  margin-top: 1em;
  margin-bottom: 0;
  color: rgba(0,0,0,0.65);
}

d-appendix h3 + * {
  margin-top: 1em;
}

d-appendix ol {
  padding: 0 0 0 15px;
}

@media (min-width: 768px) {
  d-appendix ol {
    padding: 0 0 0 30px;
    margin-left: -30px;
  }
}

d-appendix li {
  margin-bottom: 1em;
}

d-appendix a {
  color: rgba(0, 0, 0, 0.6);
}

d-appendix > * {
  grid-column: text;
}

d-appendix > d-footnote-list,
d-appendix > d-citation-list,
d-appendix > distill-appendix {
  grid-column: screen;
}

</style>

`, false);

  class Appendix extends T$2(HTMLElement) {

  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // import { Template } from '../mixins/template';
  // import { Controller } from '../controller';

  const isOnlyWhitespace = /^\s*$/;

  class Article extends HTMLElement {
    static get is() { return 'd-article'; }

    constructor() {
      super();

      new MutationObserver( (mutations) => {
        for (const mutation of mutations) {
          for (const addedNode of mutation.addedNodes) {
            switch (addedNode.nodeName) {
            case '#text': { // usually text nodes are only linebreaks.
              const text = addedNode.nodeValue;
              if (!isOnlyWhitespace.test(text)) {
                console.warn('Use of unwrapped text in distill articles is discouraged as it breaks layout! Please wrap any text in a <span> or <p> tag. We found the following text: ' + text);
                const wrapper = document.createElement('span');
                wrapper.innerHTML = addedNode.nodeValue;
                addedNode.parentNode.insertBefore(wrapper, addedNode);
                addedNode.parentNode.removeChild(addedNode);
              }
            } break;
            }
          }
        }
      }).observe(this, {childList: true});
    }

  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var bibtexParse = createCommonjsModule(function (module, exports) {
  /* start bibtexParse 0.0.22 */

  //Original work by Henrik Muehe (c) 2010
  //
  //CommonJS port by Mikola Lysenko 2013
  //
  //Port to Browser lib by ORCID / RCPETERS
  //
  //Issues:
  //no comment handling within strings
  //no string concatenation
  //no variable values yet
  //Grammar implemented here:
  //bibtex -> (string | preamble | comment | entry)*;
  //string -> '@STRING' '{' key_equals_value '}';
  //preamble -> '@PREAMBLE' '{' value '}';
  //comment -> '@COMMENT' '{' value '}';
  //entry -> '@' key '{' key ',' key_value_list '}';
  //key_value_list -> key_equals_value (',' key_equals_value)*;
  //key_equals_value -> key '=' value;
  //value -> value_quotes | value_braces | key;
  //value_quotes -> '"' .*? '"'; // not quite
  //value_braces -> '{' .*? '"'; // not quite
  (function(exports) {

      function BibtexParser() {
          
          this.months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
          this.notKey = [',','{','}',' ','='];
          this.pos = 0;
          this.input = "";
          this.entries = new Array();

          this.currentEntry = "";

          this.setInput = function(t) {
              this.input = t;
          };

          this.getEntries = function() {
              return this.entries;
          };

          this.isWhitespace = function(s) {
              return (s == ' ' || s == '\r' || s == '\t' || s == '\n');
          };

          this.match = function(s, canCommentOut) {
              if (canCommentOut == undefined || canCommentOut == null)
                  canCommentOut = true;
              this.skipWhitespace(canCommentOut);
              if (this.input.substring(this.pos, this.pos + s.length) == s) {
                  this.pos += s.length;
              } else {
                  throw "Token mismatch, expected " + s + ", found "
                          + this.input.substring(this.pos);
              }            this.skipWhitespace(canCommentOut);
          };

          this.tryMatch = function(s, canCommentOut) {
              if (canCommentOut == undefined || canCommentOut == null)
                  canCommentOut = true;
              this.skipWhitespace(canCommentOut);
              if (this.input.substring(this.pos, this.pos + s.length) == s) {
                  return true;
              } else {
                  return false;
              }        };

          /* when search for a match all text can be ignored, not just white space */
          this.matchAt = function() {
              while (this.input.length > this.pos && this.input[this.pos] != '@') {
                  this.pos++;
              }
              if (this.input[this.pos] == '@') {
                  return true;
              }            return false;
          };

          this.skipWhitespace = function(canCommentOut) {
              while (this.isWhitespace(this.input[this.pos])) {
                  this.pos++;
              }            if (this.input[this.pos] == "%" && canCommentOut == true) {
                  while (this.input[this.pos] != "\n") {
                      this.pos++;
                  }                this.skipWhitespace(canCommentOut);
              }        };

          this.value_braces = function() {
              var bracecount = 0;
              this.match("{", false);
              var start = this.pos;
              var escaped = false;
              while (true) {
                  if (!escaped) {
                      if (this.input[this.pos] == '}') {
                          if (bracecount > 0) {
                              bracecount--;
                          } else {
                              var end = this.pos;
                              this.match("}", false);
                              return this.input.substring(start, end);
                          }                    } else if (this.input[this.pos] == '{') {
                          bracecount++;
                      } else if (this.pos >= this.input.length - 1) {
                          throw "Unterminated value";
                      }                }                if (this.input[this.pos] == '\\' && escaped == false)
                      escaped = true;
                  else
                      escaped = false;
                  this.pos++;
              }        };

          this.value_comment = function() {
              var str = '';
              var brcktCnt = 0;
              while (!(this.tryMatch("}", false) && brcktCnt == 0)) {
                  str = str + this.input[this.pos];
                  if (this.input[this.pos] == '{')
                      brcktCnt++;
                  if (this.input[this.pos] == '}')
                      brcktCnt--;
                  if (this.pos >= this.input.length - 1) {
                      throw "Unterminated value:" + this.input.substring(start);
                  }                this.pos++;
              }            return str;
          };

          this.value_quotes = function() {
              this.match('"', false);
              var start = this.pos;
              var escaped = false;
              while (true) {
                  if (!escaped) {
                      if (this.input[this.pos] == '"') {
                          var end = this.pos;
                          this.match('"', false);
                          return this.input.substring(start, end);
                      } else if (this.pos >= this.input.length - 1) {
                          throw "Unterminated value:" + this.input.substring(start);
                      }                }
                  if (this.input[this.pos] == '\\' && escaped == false)
                      escaped = true;
                  else
                      escaped = false;
                  this.pos++;
              }        };

          this.single_value = function() {
              var start = this.pos;
              if (this.tryMatch("{")) {
                  return this.value_braces();
              } else if (this.tryMatch('"')) {
                  return this.value_quotes();
              } else {
                  var k = this.key();
                  if (k.match("^[0-9]+$"))
                      return k;
                  else if (this.months.indexOf(k.toLowerCase()) >= 0)
                      return k.toLowerCase();
                  else
                      throw "Value expected:" + this.input.substring(start) + ' for key: ' + k;
              
              }        };

          this.value = function() {
              var values = [];
              values.push(this.single_value());
              while (this.tryMatch("#")) {
                  this.match("#");
                  values.push(this.single_value());
              }            return values.join("");
          };

          this.key = function() {
              var start = this.pos;
              while (true) {
                  if (this.pos >= this.input.length) {
                      throw "Runaway key";
                  }                                // а-яА-Я is Cyrillic
                  //console.log(this.input[this.pos]);
                  if (this.notKey.indexOf(this.input[this.pos]) >= 0) {
                      return this.input.substring(start, this.pos);
                  } else {
                      this.pos++;
                      
                  }            }        };

          this.key_equals_value = function() {
              var key = this.key();
              if (this.tryMatch("=")) {
                  this.match("=");
                  var val = this.value();
                  return [ key, val ];
              } else {
                  throw "... = value expected, equals sign missing:"
                          + this.input.substring(this.pos);
              }        };

          this.key_value_list = function() {
              var kv = this.key_equals_value();
              this.currentEntry['entryTags'] = {};
              this.currentEntry['entryTags'][kv[0]] = kv[1];
              while (this.tryMatch(",")) {
                  this.match(",");
                  // fixes problems with commas at the end of a list
                  if (this.tryMatch("}")) {
                      break;
                  }
                  kv = this.key_equals_value();
                  this.currentEntry['entryTags'][kv[0]] = kv[1];
              }        };

          this.entry_body = function(d) {
              this.currentEntry = {};
              this.currentEntry['citationKey'] = this.key();
              this.currentEntry['entryType'] = d.substring(1);
              this.match(",");
              this.key_value_list();
              this.entries.push(this.currentEntry);
          };

          this.directive = function() {
              this.match("@");
              return "@" + this.key();
          };

          this.preamble = function() {
              this.currentEntry = {};
              this.currentEntry['entryType'] = 'PREAMBLE';
              this.currentEntry['entry'] = this.value_comment();
              this.entries.push(this.currentEntry);
          };

          this.comment = function() {
              this.currentEntry = {};
              this.currentEntry['entryType'] = 'COMMENT';
              this.currentEntry['entry'] = this.value_comment();
              this.entries.push(this.currentEntry);
          };

          this.entry = function(d) {
              this.entry_body(d);
          };

          this.bibtex = function() {
              while (this.matchAt()) {
                  var d = this.directive();
                  this.match("{");
                  if (d == "@STRING") {
                      this.string();
                  } else if (d == "@PREAMBLE") {
                      this.preamble();
                  } else if (d == "@COMMENT") {
                      this.comment();
                  } else {
                      this.entry(d);
                  }
                  this.match("}");
              }        };
      }    
      exports.toJSON = function(bibtex) {
          var b = new BibtexParser();
          b.setInput(bibtex);
          b.bibtex();
          return b.entries;
      };

      /* added during hackathon don't hate on me */
      exports.toBibtex = function(json) {
          var out = '';
          for ( var i in json) {
              out += "@" + json[i].entryType;
              out += '{';
              if (json[i].citationKey)
                  out += json[i].citationKey + ', ';
              if (json[i].entry)
                  out += json[i].entry ;
              if (json[i].entryTags) {
                  var tags = '';
                  for (var jdx in json[i].entryTags) {
                      if (tags.length != 0)
                          tags += ', ';
                      tags += jdx + '= {' + json[i].entryTags[jdx] + '}';
                  }
                  out += tags;
              }
              out += '}\n\n';
          }
          return out;
          
      };

  })( exports);

  /* end bibtexParse */
  });

  // Copyright 2018 The Distill Template Authors

  function normalizeTag(string) {
    return string
      .replace(/[\t\n ]+/g, ' ')
      .replace(/{\\["^`.'acu~Hvs]( )?([a-zA-Z])}/g, (full, x, char) => char)
      .replace(/{\\([a-zA-Z])}/g, (full, char) => char)
      .replace(/[{}]/gi,'');  // Replace curly braces forcing plaintext in latex.
  }

  function parseBibtex(bibtex) {
    const bibliography = new Map();
    const parsedEntries = bibtexParse.toJSON(bibtex);
    for (const entry of parsedEntries) {
      // normalize tags; note entryTags is an object, not Map
      for (const [key, value] of Object.entries(entry.entryTags)) {
        entry.entryTags[key.toLowerCase()] = normalizeTag(value);
      }
      entry.entryTags.type = entry.entryType;
      // add to bibliography
      bibliography.set(entry.citationKey, entry.entryTags);
    }
    return bibliography;
  }

  function serializeFrontmatterToBibtex(frontMatter) {
    return `@article{${frontMatter.slug},
  author = {${frontMatter.bibtexAuthors}},
  title = {${frontMatter.title}},
  journal = {${frontMatter.journal.title}},
  year = {${frontMatter.publishedYear}},
  note = {${frontMatter.url}},
  doi = {${frontMatter.doi}}
}`;
  }

  // Copyright 2018 The Distill Template Authors

  class Bibliography extends HTMLElement {

    static get is() { return 'd-bibliography'; }

    constructor() {
      super();

      // set up mutation observer
      const options = {childList: true, characterData: true, subtree: true};
      const observer = new MutationObserver( (entries) => {
        for (const entry of entries) {
          if (entry.target.nodeName === 'SCRIPT' || entry.type === 'characterData') {
            this.parseIfPossible();
          }
        }
      });
      observer.observe(this, options);
    }

    connectedCallback() {
      requestAnimationFrame(() => {
        this.parseIfPossible();
      });
    }

    parseIfPossible() {
      const scriptTag = this.querySelector('script');
      if (!scriptTag) return;
      if (scriptTag.type == 'text/bibtex') {
        const newBibtex = scriptTag.textContent;
        if (this.bibtex !== newBibtex) {
          this.bibtex = newBibtex;
          const bibliography = parseBibtex(this.bibtex);
          this.notify(bibliography);
        }
      } else if (scriptTag.type == 'text/json') {
        const bibliography = new Map(JSON.parse(scriptTag.textContent));
        this.notify(bibliography);
      } else {
        console.warn('Unsupported bibliography script tag type: ' + scriptTag.type);
      }
    }

    notify(bibliography) {
      const options = { detail: bibliography, bubbles: true };
      const event = new CustomEvent('onBibliographyChanged', options);
      this.dispatchEvent(event);
    }

    /* observe 'src' attribute */

    static get observedAttributes() {
      return ['src'];
    }

    receivedBibtex(event) {
      const bibliography = parseBibtex(event.target.response);
      this.notify(bibliography);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      var oReq = new XMLHttpRequest();
      oReq.onload = (e) => this.receivedBibtex(e);
      oReq.onerror = () => console.warn(`Could not load Bibtex! (tried ${newValue})`);
      oReq.responseType = 'text';
      oReq.open('GET', newValue, true);
      oReq.send();
    }


  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // import style from '../styles/d-byline.css';

  function bylineTemplate(frontMatter) {
    return `
  <div class="byline">
    <div class="authors-affiliations grid">
      ${frontMatter.authors.map(author => `
        <div class="author">
        <p class="author-name">
          ${author.personalURL ? `
            <a class="name" href="${author.personalURL}">${author.name}</a>` : `
            <span class="name">${author.name}</span>`}
        </p>
        <p class="affiliation">
        ${author.affiliations.map(affiliation =>
          affiliation.url ? `<a class="affiliation" href="${affiliation.url}">${affiliation.name}</a>` : `<span class="affiliation">${affiliation.name}</span>`
        ).join(', ')}
        </p>
        </div>
      `).join('')}
    </div>
    <!--
    <div>
      <h3>Published</h3>
      ${frontMatter.publishedDate ? `
        <p>${frontMatter.publishedMonth} ${frontMatter.publishedDay}, ${frontMatter.publishedYear}</p> ` : `
        <p><em>Not published yet.</em></p>`}
    </div>
    <div>
      <h3>DOI</h3>
      ${frontMatter.doi ? `
        <p><a href="https://doi.org/${frontMatter.doi}">${frontMatter.doi}</a></p>` : `
        <p><em>No DOI yet.</em></p>`}
    </div>
    -->
  </div>
`;
  }

  class Byline extends HTMLElement {

    static get is() { return 'd-byline'; }

    set frontMatter(frontMatter) {
      this.innerHTML = bylineTemplate(frontMatter);
    }

  }

  // Copyright 2018 The Distill Template Authors

  const T$3 = Template(
    "d-cite",
    `
<style>

:host {
  display: inline-block;
}

.citation {
  color: hsla(206, 90%, 20%, 0.7);
}

.citation-number {
  cursor: default;
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, "Roboto", Helvetica, sans-serif;
  font-size: 75%;
  color: hsla(206, 90%, 20%, 0.7);
  display: inline-block;
  line-height: 1.1em;
  text-align: center;
  position: relative;
  top: -2px;
  margin: 0 2px;
}

figcaption .citation-number {
  font-size: 11px;
  font-weight: normal;
  top: -2px;
  line-height: 1em;
}

ul {
  margin: 0;
  padding: 0;
  list-style-type: none;
}

ul li {
  padding: 15px 10px 15px 10px;
  border-bottom: 1px solid rgba(0,0,0,0.1)
}

ul li:last-of-type {
  border-bottom: none;
}

</style>

<d-hover-box id="hover-box"></d-hover-box>

<div id="citation-" class="citation">
  <span class="citation-number"></span>
</div>
`
  );

  class Cite extends T$3(HTMLElement) {
    /* Lifecycle */
    constructor() {
      super();
      this._numbers = [];
      this._entries = [];
    }

    connectedCallback() {
      this.outerSpan = this.root.querySelector("#citation-");
      this.innerSpan = this.root.querySelector(".citation-number");
      this.hoverBox = this.root.querySelector("d-hover-box");
      window.customElements.whenDefined("d-hover-box").then(() => {
        this.hoverBox.listen(this);
      });
      // in case this component got connected after values were set
      if (this.numbers) {
        this.displayNumbers(this.numbers);
      }
      if (this.entries) {
        this.displayEntries(this.entries);
      }
    }

    //TODO This causes an infinite loop on firefox with polyfills.
    // This is only needed for interactive editing so no priority.
    // disconnectedCallback() {
    // const options = { detail: [this, this.keys], bubbles: true };
    // const event = new CustomEvent('onCiteKeyRemoved', options);
    // document.dispatchEvent(event);
    // }

    /* observe 'key' attribute */

    static get observedAttributes() {
      return ["key", "bibtex-key"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      const eventName = oldValue ? "onCiteKeyChanged" : "onCiteKeyCreated";
      const keys = newValue.split(",").map(k => k.trim());
      const options = { detail: [this, keys], bubbles: true };
      const event = new CustomEvent(eventName, options);
      document.dispatchEvent(event);
    }

    set key(value) {
      this.setAttribute("key", value);
    }

    get key() {
      return this.getAttribute("key") || this.getAttribute("bibtex-key");
    }

    get keys() {
      const result = this.key.split(",");
      console.log(result);
      return result;
    }

    /* Setters & Rendering */

    set numbers(numbers) {
      this._numbers = numbers;
      this.displayNumbers(numbers);
    }

    get numbers() {
      return this._numbers;
    }

    displayNumbers(numbers) {
      if (!this.innerSpan) return;
      const numberStrings = numbers.map(index => {
        return index == -1 ? "?" : index + 1 + "";
      });
      const textContent = "[" + numberStrings.join(", ") + "]";
      this.innerSpan.textContent = textContent;
    }

    set entries(entries) {
      this._entries = entries;
      this.displayEntries(entries);
    }

    get entries() {
      return this._entries;
    }

    displayEntries(entries) {
      if (!this.hoverBox) return;
      this.hoverBox.innerHTML = `<ul>
      ${entries
        .map(hover_cite)
        .map(html => `<li>${html}</li>`)
        .join("\n")}
    </ul>`;
    }
  }

  // Copyright 2018 The Distill Template Authors

  const styles$1 = `
d-citation-list {
  contain: style;
}

d-citation-list .references {
  grid-column: text;
}

d-citation-list ol.references {
  list-style: none;
  counter-reset: reference-counter;
}

d-citation-list ol.references li {
  counter-increment: reference-counter;
  position: relative;
}

d-citation-list ol.references li::before {
  content: "[" counter(reference-counter) "]\\0000a0";
  position: absolute;
  left: -1.3rem;
}

d-citation-list .references .title {
  font-weight: 500;
}
`;

  function renderCitationList(element, entries, dom=document) {
    if (entries.size > 0) {
      element.style.display = '';
      let list = element.querySelector('.references');
      if (list) {
        list.innerHTML = '';
      } else {
        const stylesTag = dom.createElement('style');
        stylesTag.innerHTML = styles$1;
        element.appendChild(stylesTag);

        const heading = dom.createElement('h3');
        heading.id = 'references';
        heading.textContent = 'References';
        element.appendChild(heading);

        list = dom.createElement('ol');
        list.id = 'references-list';
        list.className = 'references';
        element.appendChild(list);
      }

      for (const [key, entry] of entries) {
        const listItem = dom.createElement('li');
        listItem.id = key;
        listItem.innerHTML = bibliography_cite(entry);
        list.appendChild(listItem);
      }
    } else {
      element.style.display = 'none';
    }
  }

  class CitationList extends HTMLElement {

    static get is() { return 'd-citation-list'; }

    connectedCallback() {
      if (!this.hasAttribute('distill-prerendered')) {
        this.style.display = 'none';
      }
    }

    set citations(citations) {
      renderCitationList(this, citations);
    }

  }

  var prism = createCommonjsModule(function (module) {
  /* **********************************************
       Begin prism-core.js
  ********************************************** */

  var _self = (typeof window !== 'undefined')
  	? window   // if in browser
  	: (
  		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
  		? self // if in worker
  		: {}   // if in node js
  	);

  /**
   * Prism: Lightweight, robust, elegant syntax highlighting
   * MIT license http://www.opensource.org/licenses/mit-license.php/
   * @author Lea Verou http://lea.verou.me
   */

  var Prism = (function (_self){

  // Private helper vars
  var lang = /\blang(?:uage)?-([\w-]+)\b/i;
  var uniqueId = 0;


  var _ = {
  	manual: _self.Prism && _self.Prism.manual,
  	disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,
  	util: {
  		encode: function encode(tokens) {
  			if (tokens instanceof Token) {
  				return new Token(tokens.type, encode(tokens.content), tokens.alias);
  			} else if (Array.isArray(tokens)) {
  				return tokens.map(encode);
  			} else {
  				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
  			}
  		},

  		type: function (o) {
  			return Object.prototype.toString.call(o).slice(8, -1);
  		},

  		objId: function (obj) {
  			if (!obj['__id']) {
  				Object.defineProperty(obj, '__id', { value: ++uniqueId });
  			}
  			return obj['__id'];
  		},

  		// Deep clone a language definition (e.g. to extend it)
  		clone: function deepClone(o, visited) {
  			var clone, id, type = _.util.type(o);
  			visited = visited || {};

  			switch (type) {
  				case 'Object':
  					id = _.util.objId(o);
  					if (visited[id]) {
  						return visited[id];
  					}
  					clone = {};
  					visited[id] = clone;

  					for (var key in o) {
  						if (o.hasOwnProperty(key)) {
  							clone[key] = deepClone(o[key], visited);
  						}
  					}

  					return clone;

  				case 'Array':
  					id = _.util.objId(o);
  					if (visited[id]) {
  						return visited[id];
  					}
  					clone = [];
  					visited[id] = clone;

  					o.forEach(function (v, i) {
  						clone[i] = deepClone(v, visited);
  					});

  					return clone;

  				default:
  					return o;
  			}
  		},

  		/**
  		 * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
  		 *
  		 * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
  		 *
  		 * @param {Element} element
  		 * @returns {string}
  		 */
  		getLanguage: function (element) {
  			while (element && !lang.test(element.className)) {
  				element = element.parentElement;
  			}
  			if (element) {
  				return (element.className.match(lang) || [, 'none'])[1].toLowerCase();
  			}
  			return 'none';
  		},

  		/**
  		 * Returns the script element that is currently executing.
  		 *
  		 * This does __not__ work for line script element.
  		 *
  		 * @returns {HTMLScriptElement | null}
  		 */
  		currentScript: function () {
  			if (typeof document === 'undefined') {
  				return null;
  			}
  			if ('currentScript' in document) {
  				return document.currentScript;
  			}

  			// IE11 workaround
  			// we'll get the src of the current script by parsing IE11's error stack trace
  			// this will not work for inline scripts

  			try {
  				throw new Error();
  			} catch (err) {
  				// Get file src url from stack. Specifically works with the format of stack traces in IE.
  				// A stack will look like this:
  				//
  				// Error
  				//    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
  				//    at Global code (http://localhost/components/prism-core.js:606:1)

  				var src = (/at [^(\r\n]*\((.*):.+:.+\)$/i.exec(err.stack) || [])[1];
  				if (src) {
  					var scripts = document.getElementsByTagName('script');
  					for (var i in scripts) {
  						if (scripts[i].src == src) {
  							return scripts[i];
  						}
  					}
  				}
  				return null;
  			}
  		}
  	},

  	languages: {
  		extend: function (id, redef) {
  			var lang = _.util.clone(_.languages[id]);

  			for (var key in redef) {
  				lang[key] = redef[key];
  			}

  			return lang;
  		},

  		/**
  		 * Insert a token before another token in a language literal
  		 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
  		 * we cannot just provide an object, we need an object and a key.
  		 * @param inside The key (or language id) of the parent
  		 * @param before The key to insert before.
  		 * @param insert Object with the key/value pairs to insert
  		 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
  		 */
  		insertBefore: function (inside, before, insert, root) {
  			root = root || _.languages;
  			var grammar = root[inside];
  			var ret = {};

  			for (var token in grammar) {
  				if (grammar.hasOwnProperty(token)) {

  					if (token == before) {
  						for (var newToken in insert) {
  							if (insert.hasOwnProperty(newToken)) {
  								ret[newToken] = insert[newToken];
  							}
  						}
  					}

  					// Do not insert token which also occur in insert. See #1525
  					if (!insert.hasOwnProperty(token)) {
  						ret[token] = grammar[token];
  					}
  				}
  			}

  			var old = root[inside];
  			root[inside] = ret;

  			// Update references in other language definitions
  			_.languages.DFS(_.languages, function(key, value) {
  				if (value === old && key != inside) {
  					this[key] = ret;
  				}
  			});

  			return ret;
  		},

  		// Traverse a language definition with Depth First Search
  		DFS: function DFS(o, callback, type, visited) {
  			visited = visited || {};

  			var objId = _.util.objId;

  			for (var i in o) {
  				if (o.hasOwnProperty(i)) {
  					callback.call(o, i, o[i], type || i);

  					var property = o[i],
  					    propertyType = _.util.type(property);

  					if (propertyType === 'Object' && !visited[objId(property)]) {
  						visited[objId(property)] = true;
  						DFS(property, callback, null, visited);
  					}
  					else if (propertyType === 'Array' && !visited[objId(property)]) {
  						visited[objId(property)] = true;
  						DFS(property, callback, i, visited);
  					}
  				}
  			}
  		}
  	},
  	plugins: {},

  	highlightAll: function(async, callback) {
  		_.highlightAllUnder(document, async, callback);
  	},

  	highlightAllUnder: function(container, async, callback) {
  		var env = {
  			callback: callback,
  			container: container,
  			selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
  		};

  		_.hooks.run('before-highlightall', env);

  		env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

  		_.hooks.run('before-all-elements-highlight', env);

  		for (var i = 0, element; element = env.elements[i++];) {
  			_.highlightElement(element, async === true, env.callback);
  		}
  	},

  	highlightElement: function(element, async, callback) {
  		// Find language
  		var language = _.util.getLanguage(element);
  		var grammar = _.languages[language];

  		// Set language on the element, if not present
  		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

  		// Set language on the parent, for styling
  		var parent = element.parentNode;
  		if (parent && parent.nodeName.toLowerCase() === 'pre') {
  			parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
  		}

  		var code = element.textContent;

  		var env = {
  			element: element,
  			language: language,
  			grammar: grammar,
  			code: code
  		};

  		function insertHighlightedCode(highlightedCode) {
  			env.highlightedCode = highlightedCode;

  			_.hooks.run('before-insert', env);

  			env.element.innerHTML = env.highlightedCode;

  			_.hooks.run('after-highlight', env);
  			_.hooks.run('complete', env);
  			callback && callback.call(env.element);
  		}

  		_.hooks.run('before-sanity-check', env);

  		if (!env.code) {
  			_.hooks.run('complete', env);
  			callback && callback.call(env.element);
  			return;
  		}

  		_.hooks.run('before-highlight', env);

  		if (!env.grammar) {
  			insertHighlightedCode(_.util.encode(env.code));
  			return;
  		}

  		if (async && _self.Worker) {
  			var worker = new Worker(_.filename);

  			worker.onmessage = function(evt) {
  				insertHighlightedCode(evt.data);
  			};

  			worker.postMessage(JSON.stringify({
  				language: env.language,
  				code: env.code,
  				immediateClose: true
  			}));
  		}
  		else {
  			insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
  		}
  	},

  	highlight: function (text, grammar, language) {
  		var env = {
  			code: text,
  			grammar: grammar,
  			language: language
  		};
  		_.hooks.run('before-tokenize', env);
  		env.tokens = _.tokenize(env.code, env.grammar);
  		_.hooks.run('after-tokenize', env);
  		return Token.stringify(_.util.encode(env.tokens), env.language);
  	},

  	tokenize: function(text, grammar) {
  		var rest = grammar.rest;
  		if (rest) {
  			for (var token in rest) {
  				grammar[token] = rest[token];
  			}

  			delete grammar.rest;
  		}

  		var tokenList = new LinkedList();
  		addAfter(tokenList, tokenList.head, text);

  		matchGrammar(text, tokenList, grammar, tokenList.head, 0);

  		return toArray(tokenList);
  	},

  	hooks: {
  		all: {},

  		add: function (name, callback) {
  			var hooks = _.hooks.all;

  			hooks[name] = hooks[name] || [];

  			hooks[name].push(callback);
  		},

  		run: function (name, env) {
  			var callbacks = _.hooks.all[name];

  			if (!callbacks || !callbacks.length) {
  				return;
  			}

  			for (var i=0, callback; callback = callbacks[i++];) {
  				callback(env);
  			}
  		}
  	},

  	Token: Token
  };

  _self.Prism = _;

  function Token(type, content, alias, matchedStr, greedy) {
  	this.type = type;
  	this.content = content;
  	this.alias = alias;
  	// Copy of the full string this token was created from
  	this.length = (matchedStr || '').length|0;
  	this.greedy = !!greedy;
  }

  Token.stringify = function stringify(o, language) {
  	if (typeof o == 'string') {
  		return o;
  	}
  	if (Array.isArray(o)) {
  		var s = '';
  		o.forEach(function (e) {
  			s += stringify(e, language);
  		});
  		return s;
  	}

  	var env = {
  		type: o.type,
  		content: stringify(o.content, language),
  		tag: 'span',
  		classes: ['token', o.type],
  		attributes: {},
  		language: language
  	};

  	var aliases = o.alias;
  	if (aliases) {
  		if (Array.isArray(aliases)) {
  			Array.prototype.push.apply(env.classes, aliases);
  		} else {
  			env.classes.push(aliases);
  		}
  	}

  	_.hooks.run('wrap', env);

  	var attributes = '';
  	for (var name in env.attributes) {
  		attributes += ' ' + name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
  	}

  	return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + attributes + '>' + env.content + '</' + env.tag + '>';
  };

  /**
   * @param {string} text
   * @param {LinkedList<string | Token>} tokenList
   * @param {any} grammar
   * @param {LinkedListNode<string | Token>} startNode
   * @param {number} startPos
   * @param {boolean} [oneshot=false]
   * @param {string} [target]
   */
  function matchGrammar(text, tokenList, grammar, startNode, startPos, oneshot, target) {
  	for (var token in grammar) {
  		if (!grammar.hasOwnProperty(token) || !grammar[token]) {
  			continue;
  		}

  		var patterns = grammar[token];
  		patterns = Array.isArray(patterns) ? patterns : [patterns];

  		for (var j = 0; j < patterns.length; ++j) {
  			if (target && target == token + ',' + j) {
  				return;
  			}

  			var pattern = patterns[j],
  				inside = pattern.inside,
  				lookbehind = !!pattern.lookbehind,
  				greedy = !!pattern.greedy,
  				lookbehindLength = 0,
  				alias = pattern.alias;

  			if (greedy && !pattern.pattern.global) {
  				// Without the global flag, lastIndex won't work
  				var flags = pattern.pattern.toString().match(/[imsuy]*$/)[0];
  				pattern.pattern = RegExp(pattern.pattern.source, flags + 'g');
  			}

  			pattern = pattern.pattern || pattern;

  			for ( // iterate the token list and keep track of the current token/string position
  				var currentNode = startNode.next, pos = startPos;
  				currentNode !== tokenList.tail;
  				pos += currentNode.value.length, currentNode = currentNode.next
  			) {

  				var str = currentNode.value;

  				if (tokenList.length > text.length) {
  					// Something went terribly wrong, ABORT, ABORT!
  					return;
  				}

  				if (str instanceof Token) {
  					continue;
  				}

  				var removeCount = 1; // this is the to parameter of removeBetween

  				if (greedy && currentNode != tokenList.tail.prev) {
  					pattern.lastIndex = pos;
  					var match = pattern.exec(text);
  					if (!match) {
  						break;
  					}

  					var from = match.index + (lookbehind && match[1] ? match[1].length : 0);
  					var to = match.index + match[0].length;
  					var p = pos;

  					// find the node that contains the match
  					p += currentNode.value.length;
  					while (from >= p) {
  						currentNode = currentNode.next;
  						p += currentNode.value.length;
  					}
  					// adjust pos (and p)
  					p -= currentNode.value.length;
  					pos = p;

  					// the current node is a Token, then the match starts inside another Token, which is invalid
  					if (currentNode.value instanceof Token) {
  						continue;
  					}

  					// find the last node which is affected by this match
  					for (
  						var k = currentNode;
  						k !== tokenList.tail && (p < to || (typeof k.value === 'string' && !k.prev.value.greedy));
  						k = k.next
  					) {
  						removeCount++;
  						p += k.value.length;
  					}
  					removeCount--;

  					// replace with the new match
  					str = text.slice(pos, p);
  					match.index -= pos;
  				} else {
  					pattern.lastIndex = 0;

  					var match = pattern.exec(str);
  				}

  				if (!match) {
  					if (oneshot) {
  						break;
  					}

  					continue;
  				}

  				if (lookbehind) {
  					lookbehindLength = match[1] ? match[1].length : 0;
  				}

  				var from = match.index + lookbehindLength,
  					match = match[0].slice(lookbehindLength),
  					to = from + match.length,
  					before = str.slice(0, from),
  					after = str.slice(to);

  				var removeFrom = currentNode.prev;

  				if (before) {
  					removeFrom = addAfter(tokenList, removeFrom, before);
  					pos += before.length;
  				}

  				removeRange(tokenList, removeFrom, removeCount);

  				var wrapped = new Token(token, inside ? _.tokenize(match, inside) : match, alias, match, greedy);
  				currentNode = addAfter(tokenList, removeFrom, wrapped);

  				if (after) {
  					addAfter(tokenList, currentNode, after);
  				}


  				if (removeCount > 1)
  					matchGrammar(text, tokenList, grammar, currentNode.prev, pos, true, token + ',' + j);

  				if (oneshot)
  					break;
  			}
  		}
  	}
  }

  /**
   * @typedef LinkedListNode
   * @property {T} value
   * @property {LinkedListNode<T> | null} prev The previous node.
   * @property {LinkedListNode<T> | null} next The next node.
   * @template T
   */

  /**
   * @template T
   */
  function LinkedList() {
  	/** @type {LinkedListNode<T>} */
  	var head = { value: null, prev: null, next: null };
  	/** @type {LinkedListNode<T>} */
  	var tail = { value: null, prev: head, next: null };
  	head.next = tail;

  	/** @type {LinkedListNode<T>} */
  	this.head = head;
  	/** @type {LinkedListNode<T>} */
  	this.tail = tail;
  	this.length = 0;
  }

  /**
   * Adds a new node with the given value to the list.
   * @param {LinkedList<T>} list
   * @param {LinkedListNode<T>} node
   * @param {T} value
   * @returns {LinkedListNode<T>} The added node.
   * @template T
   */
  function addAfter(list, node, value) {
  	// assumes that node != list.tail && values.length >= 0
  	var next = node.next;

  	var newNode = { value: value, prev: node, next: next };
  	node.next = newNode;
  	next.prev = newNode;
  	list.length++;

  	return newNode;
  }
  /**
   * Removes `count` nodes after the given node. The given node will not be removed.
   * @param {LinkedList<T>} list
   * @param {LinkedListNode<T>} node
   * @param {number} count
   * @template T
   */
  function removeRange(list, node, count) {
  	var next = node.next;
  	for (var i = 0; i < count && next !== list.tail; i++) {
  		next = next.next;
  	}
  	node.next = next;
  	next.prev = node;
  	list.length -= i;
  }
  /**
   * @param {LinkedList<T>} list
   * @returns {T[]}
   * @template T
   */
  function toArray(list) {
  	var array = [];
  	var node = list.head.next;
  	while (node !== list.tail) {
  		array.push(node.value);
  		node = node.next;
  	}
  	return array;
  }


  if (!_self.document) {
  	if (!_self.addEventListener) {
  		// in Node.js
  		return _;
  	}

  	if (!_.disableWorkerMessageHandler) {
  		// In worker
  		_self.addEventListener('message', function (evt) {
  			var message = JSON.parse(evt.data),
  				lang = message.language,
  				code = message.code,
  				immediateClose = message.immediateClose;

  			_self.postMessage(_.highlight(code, _.languages[lang], lang));
  			if (immediateClose) {
  				_self.close();
  			}
  		}, false);
  	}

  	return _;
  }

  //Get current script and highlight
  var script = _.util.currentScript();

  if (script) {
  	_.filename = script.src;

  	if (script.hasAttribute('data-manual')) {
  		_.manual = true;
  	}
  }

  function highlightAutomaticallyCallback() {
  	if (!_.manual) {
  		_.highlightAll();
  	}
  }

  if (!_.manual) {
  	// If the document state is "loading", then we'll use DOMContentLoaded.
  	// If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
  	// DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
  	// might take longer one animation frame to execute which can create a race condition where only some plugins have
  	// been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
  	// See https://github.com/PrismJS/prism/issues/2102
  	var readyState = document.readyState;
  	if (readyState === 'loading' || readyState === 'interactive' && script && script.defer) {
  		document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
  	} else {
  		if (window.requestAnimationFrame) {
  			window.requestAnimationFrame(highlightAutomaticallyCallback);
  		} else {
  			window.setTimeout(highlightAutomaticallyCallback, 16);
  		}
  	}
  }

  return _;

  })(_self);

  if ( module.exports) {
  	module.exports = Prism;
  }

  // hack for components to work correctly in node.js
  if (typeof commonjsGlobal !== 'undefined') {
  	commonjsGlobal.Prism = Prism;
  }


  /* **********************************************
       Begin prism-markup.js
  ********************************************** */

  Prism.languages.markup = {
  	'comment': /<!--[\s\S]*?-->/,
  	'prolog': /<\?[\s\S]+?\?>/,
  	'doctype': {
  		pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:(?!<!--)[^"'\]]|"[^"]*"|'[^']*'|<!--[\s\S]*?-->)*\]\s*)?>/i,
  		greedy: true
  	},
  	'cdata': /<!\[CDATA\[[\s\S]*?]]>/i,
  	'tag': {
  		pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/i,
  		greedy: true,
  		inside: {
  			'tag': {
  				pattern: /^<\/?[^\s>\/]+/i,
  				inside: {
  					'punctuation': /^<\/?/,
  					'namespace': /^[^\s>\/:]+:/
  				}
  			},
  			'attr-value': {
  				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/i,
  				inside: {
  					'punctuation': [
  						/^=/,
  						{
  							pattern: /^(\s*)["']|["']$/,
  							lookbehind: true
  						}
  					]
  				}
  			},
  			'punctuation': /\/?>/,
  			'attr-name': {
  				pattern: /[^\s>\/]+/,
  				inside: {
  					'namespace': /^[^\s>\/:]+:/
  				}
  			}

  		}
  	},
  	'entity': /&#?[\da-z]{1,8};/i
  };

  Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
  	Prism.languages.markup['entity'];

  // Plugin to make entity title show the real entity, idea by Roman Komarov
  Prism.hooks.add('wrap', function(env) {

  	if (env.type === 'entity') {
  		env.attributes['title'] = env.content.replace(/&amp;/, '&');
  	}
  });

  Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
  	/**
  	 * Adds an inlined language to markup.
  	 *
  	 * An example of an inlined language is CSS with `<style>` tags.
  	 *
  	 * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
  	 * case insensitive.
  	 * @param {string} lang The language key.
  	 * @example
  	 * addInlined('style', 'css');
  	 */
  	value: function addInlined(tagName, lang) {
  		var includedCdataInside = {};
  		includedCdataInside['language-' + lang] = {
  			pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
  			lookbehind: true,
  			inside: Prism.languages[lang]
  		};
  		includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

  		var inside = {
  			'included-cdata': {
  				pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
  				inside: includedCdataInside
  			}
  		};
  		inside['language-' + lang] = {
  			pattern: /[\s\S]+/,
  			inside: Prism.languages[lang]
  		};

  		var def = {};
  		def[tagName] = {
  			pattern: RegExp(/(<__[\s\S]*?>)(?:<!\[CDATA\[[\s\S]*?\]\]>\s*|[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function () { return tagName; }), 'i'),
  			lookbehind: true,
  			greedy: true,
  			inside: inside
  		};

  		Prism.languages.insertBefore('markup', 'cdata', def);
  	}
  });

  Prism.languages.xml = Prism.languages.extend('markup', {});
  Prism.languages.html = Prism.languages.markup;
  Prism.languages.mathml = Prism.languages.markup;
  Prism.languages.svg = Prism.languages.markup;


  /* **********************************************
       Begin prism-css.js
  ********************************************** */

  (function (Prism) {

  	var string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;

  	Prism.languages.css = {
  		'comment': /\/\*[\s\S]*?\*\//,
  		'atrule': {
  			pattern: /@[\w-]+[\s\S]*?(?:;|(?=\s*\{))/,
  			inside: {
  				'rule': /^@[\w-]+/,
  				'selector-function-argument': {
  					pattern: /(\bselector\s*\((?!\s*\))\s*)(?:[^()]|\((?:[^()]|\([^()]*\))*\))+?(?=\s*\))/,
  					lookbehind: true,
  					alias: 'selector'
  				}
  				// See rest below
  			}
  		},
  		'url': {
  			pattern: RegExp('url\\((?:' + string.source + '|[^\n\r()]*)\\)', 'i'),
  			greedy: true,
  			inside: {
  				'function': /^url/i,
  				'punctuation': /^\(|\)$/
  			}
  		},
  		'selector': RegExp('[^{}\\s](?:[^{};"\']|' + string.source + ')*?(?=\\s*\\{)'),
  		'string': {
  			pattern: string,
  			greedy: true
  		},
  		'property': /[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,
  		'important': /!important\b/i,
  		'function': /[-a-z0-9]+(?=\()/i,
  		'punctuation': /[(){};:,]/
  	};

  	Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

  	var markup = Prism.languages.markup;
  	if (markup) {
  		markup.tag.addInlined('style', 'css');

  		Prism.languages.insertBefore('inside', 'attr-value', {
  			'style-attr': {
  				pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
  				inside: {
  					'attr-name': {
  						pattern: /^\s*style/i,
  						inside: markup.tag.inside
  					},
  					'punctuation': /^\s*=\s*['"]|['"]\s*$/,
  					'attr-value': {
  						pattern: /.+/i,
  						inside: Prism.languages.css
  					}
  				},
  				alias: 'language-css'
  			}
  		}, markup.tag);
  	}

  }(Prism));


  /* **********************************************
       Begin prism-clike.js
  ********************************************** */

  Prism.languages.clike = {
  	'comment': [
  		{
  			pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
  			lookbehind: true
  		},
  		{
  			pattern: /(^|[^\\:])\/\/.*/,
  			lookbehind: true,
  			greedy: true
  		}
  	],
  	'string': {
  		pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
  		greedy: true
  	},
  	'class-name': {
  		pattern: /(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,
  		lookbehind: true,
  		inside: {
  			'punctuation': /[.\\]/
  		}
  	},
  	'keyword': /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
  	'boolean': /\b(?:true|false)\b/,
  	'function': /\w+(?=\()/,
  	'number': /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
  	'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
  	'punctuation': /[{}[\];(),.:]/
  };


  /* **********************************************
       Begin prism-javascript.js
  ********************************************** */

  Prism.languages.javascript = Prism.languages.extend('clike', {
  	'class-name': [
  		Prism.languages.clike['class-name'],
  		{
  			pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
  			lookbehind: true
  		}
  	],
  	'keyword': [
  		{
  			pattern: /((?:^|})\s*)(?:catch|finally)\b/,
  			lookbehind: true
  		},
  		{
  			pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
  			lookbehind: true
  		},
  	],
  	'number': /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
  	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
  	'function': /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
  	'operator': /--|\+\+|\*\*=?|=>|&&|\|\||[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?[.?]?|[~:]/
  });

  Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;

  Prism.languages.insertBefore('javascript', 'keyword', {
  	'regex': {
  		pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=(?:\s|\/\*[\s\S]*?\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,
  		lookbehind: true,
  		greedy: true
  	},
  	// This must be declared before keyword because we use "function" inside the look-forward
  	'function-variable': {
  		pattern: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,
  		alias: 'function'
  	},
  	'parameter': [
  		{
  			pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,
  			lookbehind: true,
  			inside: Prism.languages.javascript
  		},
  		{
  			pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i,
  			inside: Prism.languages.javascript
  		},
  		{
  			pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,
  			lookbehind: true,
  			inside: Prism.languages.javascript
  		},
  		{
  			pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,
  			lookbehind: true,
  			inside: Prism.languages.javascript
  		}
  	],
  	'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
  });

  Prism.languages.insertBefore('javascript', 'string', {
  	'template-string': {
  		pattern: /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}|(?!\${)[^\\`])*`/,
  		greedy: true,
  		inside: {
  			'template-punctuation': {
  				pattern: /^`|`$/,
  				alias: 'string'
  			},
  			'interpolation': {
  				pattern: /((?:^|[^\\])(?:\\{2})*)\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}/,
  				lookbehind: true,
  				inside: {
  					'interpolation-punctuation': {
  						pattern: /^\${|}$/,
  						alias: 'punctuation'
  					},
  					rest: Prism.languages.javascript
  				}
  			},
  			'string': /[\s\S]+/
  		}
  	}
  });

  if (Prism.languages.markup) {
  	Prism.languages.markup.tag.addInlined('script', 'javascript');
  }

  Prism.languages.js = Prism.languages.javascript;


  /* **********************************************
       Begin prism-file-highlight.js
  ********************************************** */

  (function () {
  	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
  		return;
  	}

  	/**
  	 * @param {Element} [container=document]
  	 */
  	self.Prism.fileHighlight = function(container) {
  		container = container || document;

  		var Extensions = {
  			'js': 'javascript',
  			'py': 'python',
  			'rb': 'ruby',
  			'ps1': 'powershell',
  			'psm1': 'powershell',
  			'sh': 'bash',
  			'bat': 'batch',
  			'h': 'c',
  			'tex': 'latex'
  		};

  		Array.prototype.slice.call(container.querySelectorAll('pre[data-src]')).forEach(function (pre) {
  			// ignore if already loaded
  			if (pre.hasAttribute('data-src-loaded')) {
  				return;
  			}

  			// load current
  			var src = pre.getAttribute('data-src');

  			var language, parent = pre;
  			var lang = /\blang(?:uage)?-([\w-]+)\b/i;
  			while (parent && !lang.test(parent.className)) {
  				parent = parent.parentNode;
  			}

  			if (parent) {
  				language = (pre.className.match(lang) || [, ''])[1];
  			}

  			if (!language) {
  				var extension = (src.match(/\.(\w+)$/) || [, ''])[1];
  				language = Extensions[extension] || extension;
  			}

  			var code = document.createElement('code');
  			code.className = 'language-' + language;

  			pre.textContent = '';

  			code.textContent = 'Loading…';

  			pre.appendChild(code);

  			var xhr = new XMLHttpRequest();

  			xhr.open('GET', src, true);

  			xhr.onreadystatechange = function () {
  				if (xhr.readyState == 4) {

  					if (xhr.status < 400 && xhr.responseText) {
  						code.textContent = xhr.responseText;

  						Prism.highlightElement(code);
  						// mark as loaded
  						pre.setAttribute('data-src-loaded', '');
  					}
  					else if (xhr.status >= 400) {
  						code.textContent = '✖ Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
  					}
  					else {
  						code.textContent = '✖ Error: File does not exist or is empty';
  					}
  				}
  			};

  			xhr.send(null);
  		});
  	};

  	document.addEventListener('DOMContentLoaded', function () {
  		// execute inside handler, for dropping Event as argument
  		self.Prism.fileHighlight();
  	});

  })();
  });

  Prism.languages.python = {
  	'comment': {
  		pattern: /(^|[^\\])#.*/,
  		lookbehind: true
  	},
  	'string-interpolation': {
  		pattern: /(?:f|rf|fr)(?:("""|''')[\s\S]+?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,
  		greedy: true,
  		inside: {
  			'interpolation': {
  				// "{" <expression> <optional "!s", "!r", or "!a"> <optional ":" format specifier> "}"
  				pattern: /((?:^|[^{])(?:{{)*){(?!{)(?:[^{}]|{(?!{)(?:[^{}]|{(?!{)(?:[^{}])+})+})+}/,
  				lookbehind: true,
  				inside: {
  					'format-spec': {
  						pattern: /(:)[^:(){}]+(?=}$)/,
  						lookbehind: true
  					},
  					'conversion-option': {
  						pattern: /![sra](?=[:}]$)/,
  						alias: 'punctuation'
  					},
  					rest: null
  				}
  			},
  			'string': /[\s\S]+/
  		}
  	},
  	'triple-quoted-string': {
  		pattern: /(?:[rub]|rb|br)?("""|''')[\s\S]+?\1/i,
  		greedy: true,
  		alias: 'string'
  	},
  	'string': {
  		pattern: /(?:[rub]|rb|br)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i,
  		greedy: true
  	},
  	'function': {
  		pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,
  		lookbehind: true
  	},
  	'class-name': {
  		pattern: /(\bclass\s+)\w+/i,
  		lookbehind: true
  	},
  	'decorator': {
  		pattern: /(^\s*)@\w+(?:\.\w+)*/im,
  		lookbehind: true,
  		alias: ['annotation', 'punctuation'],
  		inside: {
  			'punctuation': /\./
  		}
  	},
  	'keyword': /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,
  	'builtin': /\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,
  	'boolean': /\b(?:True|False|None)\b/,
  	'number': /(?:\b(?=\d)|\B(?=\.))(?:0[bo])?(?:(?:\d|0x[\da-f])[\da-f]*\.?\d*|\.\d+)(?:e[+-]?\d+)?j?\b/i,
  	'operator': /[-+%=]=?|!=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,
  	'punctuation': /[{}[\];(),.:]/
  };

  Prism.languages.python['string-interpolation'].inside['interpolation'].inside.rest = Prism.languages.python;

  Prism.languages.py = Prism.languages.python;

  Prism.languages.clike = {
  	'comment': [
  		{
  			pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
  			lookbehind: true
  		},
  		{
  			pattern: /(^|[^\\:])\/\/.*/,
  			lookbehind: true,
  			greedy: true
  		}
  	],
  	'string': {
  		pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
  		greedy: true
  	},
  	'class-name': {
  		pattern: /(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,
  		lookbehind: true,
  		inside: {
  			'punctuation': /[.\\]/
  		}
  	},
  	'keyword': /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
  	'boolean': /\b(?:true|false)\b/,
  	'function': /\w+(?=\()/,
  	'number': /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
  	'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
  	'punctuation': /[{}[\];(),.:]/
  };

  Prism.languages.lua = {
  	'comment': /^#!.+|--(?:\[(=*)\[[\s\S]*?\]\1\]|.*)/m,
  	// \z may be used to skip the following space
  	'string': {
  		pattern: /(["'])(?:(?!\1)[^\\\r\n]|\\z(?:\r\n|\s)|\\(?:\r\n|[\s\S]))*\1|\[(=*)\[[\s\S]*?\]\2\]/,
  		greedy: true
  	},
  	'number': /\b0x[a-f\d]+\.?[a-f\d]*(?:p[+-]?\d+)?\b|\b\d+(?:\.\B|\.?\d*(?:e[+-]?\d+)?\b)|\B\.\d+(?:e[+-]?\d+)?\b/i,
  	'keyword': /\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/,
  	'function': /(?!\d)\w+(?=\s*(?:[({]))/,
  	'operator': [
  		/[-+*%^&|#]|\/\/?|<[<=]?|>[>=]?|[=~]=?/,
  		{
  			// Match ".." but don't break "..."
  			pattern: /(^|[^.])\.\.(?!\.)/,
  			lookbehind: true
  		}
  	],
  	'punctuation': /[\[\](){},;]|\.+|:+/
  };

  (function(Prism) {
  	// $ set | grep '^[A-Z][^[:space:]]*=' | cut -d= -f1 | tr '\n' '|'
  	// + LC_ALL, RANDOM, REPLY, SECONDS.
  	// + make sure PS1..4 are here as they are not always set,
  	// - some useless things.
  	var envVars = '\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b';
  	var insideString = {
  		'environment': {
  			pattern: RegExp("\\$" + envVars),
  			alias: 'constant'
  		},
  		'variable': [
  			// [0]: Arithmetic Environment
  			{
  				pattern: /\$?\(\([\s\S]+?\)\)/,
  				greedy: true,
  				inside: {
  					// If there is a $ sign at the beginning highlight $(( and )) as variable
  					'variable': [
  						{
  							pattern: /(^\$\(\([\s\S]+)\)\)/,
  							lookbehind: true
  						},
  						/^\$\(\(/
  					],
  					'number': /\b0x[\dA-Fa-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee]-?\d+)?/,
  					// Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
  					'operator': /--?|-=|\+\+?|\+=|!=?|~|\*\*?|\*=|\/=?|%=?|<<=?|>>=?|<=?|>=?|==?|&&?|&=|\^=?|\|\|?|\|=|\?|:/,
  					// If there is no $ sign at the beginning highlight (( and )) as punctuation
  					'punctuation': /\(\(?|\)\)?|,|;/
  				}
  			},
  			// [1]: Command Substitution
  			{
  				pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
  				greedy: true,
  				inside: {
  					'variable': /^\$\(|^`|\)$|`$/
  				}
  			},
  			// [2]: Brace expansion
  			{
  				pattern: /\$\{[^}]+\}/,
  				greedy: true,
  				inside: {
  					'operator': /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
  					'punctuation': /[\[\]]/,
  					'environment': {
  						pattern: RegExp("(\\{)" + envVars),
  						lookbehind: true,
  						alias: 'constant'
  					}
  				}
  			},
  			/\$(?:\w+|[#?*!@$])/
  		],
  		// Escape sequences from echo and printf's manuals, and escaped quotes.
  		'entity': /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})/
  	};

  	Prism.languages.bash = {
  		'shebang': {
  			pattern: /^#!\s*\/.*/,
  			alias: 'important'
  		},
  		'comment': {
  			pattern: /(^|[^"{\\$])#.*/,
  			lookbehind: true
  		},
  		'function-name': [
  			// a) function foo {
  			// b) foo() {
  			// c) function foo() {
  			// but not “foo {”
  			{
  				// a) and c)
  				pattern: /(\bfunction\s+)\w+(?=(?:\s*\(?:\s*\))?\s*\{)/,
  				lookbehind: true,
  				alias: 'function'
  			},
  			{
  				// b)
  				pattern: /\b\w+(?=\s*\(\s*\)\s*\{)/,
  				alias: 'function'
  			}
  		],
  		// Highlight variable names as variables in for and select beginnings.
  		'for-or-select': {
  			pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
  			alias: 'variable',
  			lookbehind: true
  		},
  		// Highlight variable names as variables in the left-hand part
  		// of assignments (“=” and “+=”).
  		'assign-left': {
  			pattern: /(^|[\s;|&]|[<>]\()\w+(?=\+?=)/,
  			inside: {
  				'environment': {
  					pattern: RegExp("(^|[\\s;|&]|[<>]\\()" + envVars),
  					lookbehind: true,
  					alias: 'constant'
  				}
  			},
  			alias: 'variable',
  			lookbehind: true
  		},
  		'string': [
  			// Support for Here-documents https://en.wikipedia.org/wiki/Here_document
  			{
  				pattern: /((?:^|[^<])<<-?\s*)(\w+?)\s*(?:\r?\n|\r)[\s\S]*?(?:\r?\n|\r)\2/,
  				lookbehind: true,
  				greedy: true,
  				inside: insideString
  			},
  			// Here-document with quotes around the tag
  			// → No expansion (so no “inside”).
  			{
  				pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s*(?:\r?\n|\r)[\s\S]*?(?:\r?\n|\r)\3/,
  				lookbehind: true,
  				greedy: true
  			},
  			// “Normal” string
  			{
  				pattern: /(^|[^\\](?:\\\\)*)(["'])(?:\\[\s\S]|\$\([^)]+\)|`[^`]+`|(?!\2)[^\\])*\2/,
  				lookbehind: true,
  				greedy: true,
  				inside: insideString
  			}
  		],
  		'environment': {
  			pattern: RegExp("\\$?" + envVars),
  			alias: 'constant'
  		},
  		'variable': insideString.variable,
  		'function': {
  			pattern: /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|aptitude|apt-cache|apt-get|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
  			lookbehind: true
  		},
  		'keyword': {
  			pattern: /(^|[\s;|&]|[<>]\()(?:if|then|else|elif|fi|for|while|in|case|esac|function|select|do|done|until)(?=$|[)\s;|&])/,
  			lookbehind: true
  		},
  		// https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
  		'builtin': {
  			pattern: /(^|[\s;|&]|[<>]\()(?:\.|:|break|cd|continue|eval|exec|exit|export|getopts|hash|pwd|readonly|return|shift|test|times|trap|umask|unset|alias|bind|builtin|caller|command|declare|echo|enable|help|let|local|logout|mapfile|printf|read|readarray|source|type|typeset|ulimit|unalias|set|shopt)(?=$|[)\s;|&])/,
  			lookbehind: true,
  			// Alias added to make those easier to distinguish from strings.
  			alias: 'class-name'
  		},
  		'boolean': {
  			pattern: /(^|[\s;|&]|[<>]\()(?:true|false)(?=$|[)\s;|&])/,
  			lookbehind: true
  		},
  		'file-descriptor': {
  			pattern: /\B&\d\b/,
  			alias: 'important'
  		},
  		'operator': {
  			// Lots of redirections here, but not just that.
  			pattern: /\d?<>|>\||\+=|==?|!=?|=~|<<[<-]?|[&\d]?>>|\d?[<>]&?|&[>&]?|\|[&|]?|<=?|>=?/,
  			inside: {
  				'file-descriptor': {
  					pattern: /^\d/,
  					alias: 'important'
  				}
  			}
  		},
  		'punctuation': /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
  		'number': {
  			pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
  			lookbehind: true
  		}
  	};

  	/* Patterns in command substitution. */
  	var toBeCopied = [
  		'comment',
  		'function-name',
  		'for-or-select',
  		'assign-left',
  		'string',
  		'environment',
  		'function',
  		'keyword',
  		'builtin',
  		'boolean',
  		'file-descriptor',
  		'operator',
  		'punctuation',
  		'number'
  	];
  	var inside = insideString.variable[1].inside;
  	for(var i = 0; i < toBeCopied.length; i++) {
  		inside[toBeCopied[i]] = Prism.languages.bash[toBeCopied[i]];
  	}

  	Prism.languages.shell = Prism.languages.bash;
  })(Prism);

  Prism.languages.go = Prism.languages.extend('clike', {
  	'keyword': /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(?:to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/,
  	'builtin': /\b(?:bool|byte|complex(?:64|128)|error|float(?:32|64)|rune|string|u?int(?:8|16|32|64)?|uintptr|append|cap|close|complex|copy|delete|imag|len|make|new|panic|print(?:ln)?|real|recover)\b/,
  	'boolean': /\b(?:_|iota|nil|true|false)\b/,
  	'operator': /[*\/%^!=]=?|\+[=+]?|-[=-]?|\|[=|]?|&(?:=|&|\^=?)?|>(?:>=?|=)?|<(?:<=?|=|-)?|:=|\.\.\./,
  	'number': /(?:\b0x[a-f\d]+|(?:\b\d+\.?\d*|\B\.\d+)(?:e[-+]?\d+)?)i?/i,
  	'string': {
  		pattern: /(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1/,
  		greedy: true
  	}
  });
  delete Prism.languages.go['class-name'];

  (function (Prism) {

  	// Allow only one line break
  	var inner = /(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?!\n|\r\n?))/.source;

  	/**
  	 * This function is intended for the creation of the bold or italic pattern.
  	 *
  	 * This also adds a lookbehind group to the given pattern to ensure that the pattern is not backslash-escaped.
  	 *
  	 * _Note:_ Keep in mind that this adds a capturing group.
  	 *
  	 * @param {string} pattern
  	 * @param {boolean} starAlternative Whether to also add an alternative where all `_`s are replaced with `*`s.
  	 * @returns {RegExp}
  	 */
  	function createInline(pattern, starAlternative) {
  		pattern = pattern.replace(/<inner>/g, function () { return inner; });
  		if (starAlternative) {
  			pattern = pattern + '|' + pattern.replace(/_/g, '\\*');
  		}
  		return RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + '(?:' + pattern + ')');
  	}


  	var tableCell = /(?:\\.|``.+?``|`[^`\r\n]+`|[^\\|\r\n`])+/.source;
  	var tableRow = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|$)/.source.replace(/__/g, function () { return tableCell; });
  	var tableLine = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;


  	Prism.languages.markdown = Prism.languages.extend('markup', {});
  	Prism.languages.insertBefore('markdown', 'prolog', {
  		'blockquote': {
  			// > ...
  			pattern: /^>(?:[\t ]*>)*/m,
  			alias: 'punctuation'
  		},
  		'table': {
  			pattern: RegExp('^' + tableRow + tableLine + '(?:' + tableRow + ')*', 'm'),
  			inside: {
  				'table-data-rows': {
  					pattern: RegExp('^(' + tableRow + tableLine + ')(?:' + tableRow + ')*$'),
  					lookbehind: true,
  					inside: {
  						'table-data': {
  							pattern: RegExp(tableCell),
  							inside: Prism.languages.markdown
  						},
  						'punctuation': /\|/
  					}
  				},
  				'table-line': {
  					pattern: RegExp('^(' + tableRow + ')' + tableLine + '$'),
  					lookbehind: true,
  					inside: {
  						'punctuation': /\||:?-{3,}:?/
  					}
  				},
  				'table-header-row': {
  					pattern: RegExp('^' + tableRow + '$'),
  					inside: {
  						'table-header': {
  							pattern: RegExp(tableCell),
  							alias: 'important',
  							inside: Prism.languages.markdown
  						},
  						'punctuation': /\|/
  					}
  				}
  			}
  		},
  		'code': [
  			{
  				// Prefixed by 4 spaces or 1 tab and preceded by an empty line
  				pattern: /((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,
  				lookbehind: true,
  				alias: 'keyword'
  			},
  			{
  				// `code`
  				// ``code``
  				pattern: /``.+?``|`[^`\r\n]+`/,
  				alias: 'keyword'
  			},
  			{
  				// ```optional language
  				// code block
  				// ```
  				pattern: /^```[\s\S]*?^```$/m,
  				greedy: true,
  				inside: {
  					'code-block': {
  						pattern: /^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,
  						lookbehind: true
  					},
  					'code-language': {
  						pattern: /^(```).+/,
  						lookbehind: true
  					},
  					'punctuation': /```/
  				}
  			}
  		],
  		'title': [
  			{
  				// title 1
  				// =======

  				// title 2
  				// -------
  				pattern: /\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,
  				alias: 'important',
  				inside: {
  					punctuation: /==+$|--+$/
  				}
  			},
  			{
  				// # title 1
  				// ###### title 6
  				pattern: /(^\s*)#+.+/m,
  				lookbehind: true,
  				alias: 'important',
  				inside: {
  					punctuation: /^#+|#+$/
  				}
  			}
  		],
  		'hr': {
  			// ***
  			// ---
  			// * * *
  			// -----------
  			pattern: /(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,
  			lookbehind: true,
  			alias: 'punctuation'
  		},
  		'list': {
  			// * item
  			// + item
  			// - item
  			// 1. item
  			pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
  			lookbehind: true,
  			alias: 'punctuation'
  		},
  		'url-reference': {
  			// [id]: http://example.com "Optional title"
  			// [id]: http://example.com 'Optional title'
  			// [id]: http://example.com (Optional title)
  			// [id]: <http://example.com> "Optional title"
  			pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
  			inside: {
  				'variable': {
  					pattern: /^(!?\[)[^\]]+/,
  					lookbehind: true
  				},
  				'string': /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
  				'punctuation': /^[\[\]!:]|[<>]/
  			},
  			alias: 'url'
  		},
  		'bold': {
  			// **strong**
  			// __strong__

  			// allow one nested instance of italic text using the same delimiter
  			pattern: createInline(/__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__/.source, true),
  			lookbehind: true,
  			greedy: true,
  			inside: {
  				'content': {
  					pattern: /(^..)[\s\S]+(?=..$)/,
  					lookbehind: true,
  					inside: {} // see below
  				},
  				'punctuation': /\*\*|__/
  			}
  		},
  		'italic': {
  			// *em*
  			// _em_

  			// allow one nested instance of bold text using the same delimiter
  			pattern: createInline(/_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_/.source, true),
  			lookbehind: true,
  			greedy: true,
  			inside: {
  				'content': {
  					pattern: /(^.)[\s\S]+(?=.$)/,
  					lookbehind: true,
  					inside: {} // see below
  				},
  				'punctuation': /[*_]/
  			}
  		},
  		'strike': {
  			// ~~strike through~~
  			// ~strike~
  			pattern: createInline(/(~~?)(?:(?!~)<inner>)+?\2/.source, false),
  			lookbehind: true,
  			greedy: true,
  			inside: {
  				'content': {
  					pattern: /(^~~?)[\s\S]+(?=\1$)/,
  					lookbehind: true,
  					inside: {} // see below
  				},
  				'punctuation': /~~?/
  			}
  		},
  		'url': {
  			// [example](http://example.com "Optional title")
  			// [example][id]
  			// [example] [id]
  			pattern: createInline(/!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)| ?\[(?:(?!\])<inner>)+\])/.source, false),
  			lookbehind: true,
  			greedy: true,
  			inside: {
  				'variable': {
  					pattern: /(\[)[^\]]+(?=\]$)/,
  					lookbehind: true
  				},
  				'content': {
  					pattern: /(^!?\[)[^\]]+(?=\])/,
  					lookbehind: true,
  					inside: {} // see below
  				},
  				'string': {
  					pattern: /"(?:\\.|[^"\\])*"(?=\)$)/
  				}
  			}
  		}
  	});

  	['url', 'bold', 'italic', 'strike'].forEach(function (token) {
  		['url', 'bold', 'italic', 'strike'].forEach(function (inside) {
  			if (token !== inside) {
  				Prism.languages.markdown[token].inside.content.inside[inside] = Prism.languages.markdown[inside];
  			}
  		});
  	});

  	Prism.hooks.add('after-tokenize', function (env) {
  		if (env.language !== 'markdown' && env.language !== 'md') {
  			return;
  		}

  		function walkTokens(tokens) {
  			if (!tokens || typeof tokens === 'string') {
  				return;
  			}

  			for (var i = 0, l = tokens.length; i < l; i++) {
  				var token = tokens[i];

  				if (token.type !== 'code') {
  					walkTokens(token.content);
  					continue;
  				}

  				/*
  				 * Add the correct `language-xxxx` class to this code block. Keep in mind that the `code-language` token
  				 * is optional. But the grammar is defined so that there is only one case we have to handle:
  				 *
  				 * token.content = [
  				 *     <span class="punctuation">```</span>,
  				 *     <span class="code-language">xxxx</span>,
  				 *     '\n', // exactly one new lines (\r or \n or \r\n)
  				 *     <span class="code-block">...</span>,
  				 *     '\n', // exactly one new lines again
  				 *     <span class="punctuation">```</span>
  				 * ];
  				 */

  				var codeLang = token.content[1];
  				var codeBlock = token.content[3];

  				if (codeLang && codeBlock &&
  					codeLang.type === 'code-language' && codeBlock.type === 'code-block' &&
  					typeof codeLang.content === 'string') {

  					// this might be a language that Prism does not support

  					// do some replacements to support C++, C#, and F#
  					var lang = codeLang.content.replace(/\b#/g, 'sharp').replace(/\b\+\+/g, 'pp');
  					// only use the first word
  					lang = (/[a-z][\w-]*/i.exec(lang) || [''])[0].toLowerCase();
  					var alias = 'language-' + lang;

  					// add alias
  					if (!codeBlock.alias) {
  						codeBlock.alias = [alias];
  					} else if (typeof codeBlock.alias === 'string') {
  						codeBlock.alias = [codeBlock.alias, alias];
  					} else {
  						codeBlock.alias.push(alias);
  					}
  				}
  			}
  		}

  		walkTokens(env.tokens);
  	});

  	Prism.hooks.add('wrap', function (env) {
  		if (env.type !== 'code-block') {
  			return;
  		}

  		var codeLang = '';
  		for (var i = 0, l = env.classes.length; i < l; i++) {
  			var cls = env.classes[i];
  			var match = /language-(.+)/.exec(cls);
  			if (match) {
  				codeLang = match[1];
  				break;
  			}
  		}

  		var grammar = Prism.languages[codeLang];

  		if (!grammar) {
  			if (codeLang && codeLang !== 'none' && Prism.plugins.autoloader) {
  				var id = 'md-' + new Date().valueOf() + '-' + Math.floor(Math.random() * 1e16);
  				env.attributes['id'] = id;

  				Prism.plugins.autoloader.loadLanguages(codeLang, function () {
  					var ele = document.getElementById(id);
  					if (ele) {
  						ele.innerHTML = Prism.highlight(ele.textContent, Prism.languages[codeLang], codeLang);
  					}
  				});
  			}
  		} else {
  			// reverse Prism.util.encode
  			var code = env.content.replace(/&lt;/g, '<').replace(/&amp;/g, '&');

  			env.content = Prism.highlight(code, grammar, codeLang);
  		}
  	});

  	Prism.languages.md = Prism.languages.markdown;

  }(Prism));

  Prism.languages.julia= {
  	'comment': {
  		pattern: /(^|[^\\])#.*/,
  		lookbehind: true
  	},
  	'string': /("""|''')[\s\S]+?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2/,
  	'keyword' : /\b(?:abstract|baremodule|begin|bitstype|break|catch|ccall|const|continue|do|else|elseif|end|export|finally|for|function|global|if|immutable|import|importall|in|let|local|macro|module|print|println|quote|return|struct|try|type|typealias|using|while)\b/,
  	'boolean' : /\b(?:true|false)\b/,
  	'number' : /(?:\b(?=\d)|\B(?=\.))(?:0[box])?(?:[\da-f]+\.?\d*|\.\d+)(?:[efp][+-]?\d+)?j?/i,
  	'operator': /[-+*^%÷&$\\]=?|\/[\/=]?|!=?=?|\|[=>]?|<(?:<=?|[=:])?|>(?:=|>>?=?)?|==?=?|[~≠≤≥]/,
  	'punctuation' : /[{}[\];(),.:]/,
  	'constant': /\b(?:(?:NaN|Inf)(?:16|32|64)?)\b/
  };

  var css = "/**\n * prism.js default theme for JavaScript, CSS and HTML\n * Based on dabblet (http://dabblet.com)\n * @author Lea Verou\n */\n\ncode[class*=\"language-\"],\npre[class*=\"language-\"] {\n\tcolor: black;\n\tbackground: none;\n\ttext-shadow: 0 1px white;\n\tfont-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;\n\tfont-size: 1em;\n\ttext-align: left;\n\twhite-space: pre;\n\tword-spacing: normal;\n\tword-break: normal;\n\tword-wrap: normal;\n\tline-height: 1.5;\n\n\t-moz-tab-size: 4;\n\t-o-tab-size: 4;\n\ttab-size: 4;\n\n\t-webkit-hyphens: none;\n\t-moz-hyphens: none;\n\t-ms-hyphens: none;\n\thyphens: none;\n}\n\npre[class*=\"language-\"]::-moz-selection, pre[class*=\"language-\"] ::-moz-selection,\ncode[class*=\"language-\"]::-moz-selection, code[class*=\"language-\"] ::-moz-selection {\n\ttext-shadow: none;\n\tbackground: #b3d4fc;\n}\n\npre[class*=\"language-\"]::selection, pre[class*=\"language-\"] ::selection,\ncode[class*=\"language-\"]::selection, code[class*=\"language-\"] ::selection {\n\ttext-shadow: none;\n\tbackground: #b3d4fc;\n}\n\n@media print {\n\tcode[class*=\"language-\"],\n\tpre[class*=\"language-\"] {\n\t\ttext-shadow: none;\n\t}\n}\n\n/* Code blocks */\npre[class*=\"language-\"] {\n\tpadding: 1em;\n\tmargin: .5em 0;\n\toverflow: auto;\n}\n\n:not(pre) > code[class*=\"language-\"],\npre[class*=\"language-\"] {\n\tbackground: #f5f2f0;\n}\n\n/* Inline code */\n:not(pre) > code[class*=\"language-\"] {\n\tpadding: .1em;\n\tborder-radius: .3em;\n\twhite-space: normal;\n}\n\n.token.comment,\n.token.prolog,\n.token.doctype,\n.token.cdata {\n\tcolor: slategray;\n}\n\n.token.punctuation {\n\tcolor: #999;\n}\n\n.token.namespace {\n\topacity: .7;\n}\n\n.token.property,\n.token.tag,\n.token.boolean,\n.token.number,\n.token.constant,\n.token.symbol,\n.token.deleted {\n\tcolor: #905;\n}\n\n.token.selector,\n.token.attr-name,\n.token.string,\n.token.char,\n.token.builtin,\n.token.inserted {\n\tcolor: #690;\n}\n\n.token.operator,\n.token.entity,\n.token.url,\n.language-css .token.string,\n.style .token.string {\n\tcolor: #9a6e3a;\n\tbackground: hsla(0, 0%, 100%, .5);\n}\n\n.token.atrule,\n.token.attr-value,\n.token.keyword {\n\tcolor: #07a;\n}\n\n.token.function,\n.token.class-name {\n\tcolor: #DD4A68;\n}\n\n.token.regex,\n.token.important,\n.token.variable {\n\tcolor: #e90;\n}\n\n.token.important,\n.token.bold {\n\tfont-weight: bold;\n}\n.token.italic {\n\tfont-style: italic;\n}\n\n.token.entity {\n\tcursor: help;\n}\n";

  // Copyright 2018 The Distill Template Authors

  const T$4 = Template('d-code', `
<style>

:host {
  font-size: 1rem;
}

code {
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 2px;
  padding: 4px 7px;
  color: rgba(0, 0, 0, 0.6);
}

pre code {
  display: block;
  border-left: 2px solid rgba(0, 0, 0, .1);
  padding: 0 0 0 36px;
}

${css}
</style>

<code id="code-container"></code>

`);

  class Code extends Mutating(T$4(HTMLElement)) {

    renderContent() {

      // check if language can be highlighted
      this.languageName = this.getAttribute('language');
      if (!this.languageName) {
        console.warn('You need to provide a language attribute to your <d-code> block to let us know how to highlight your code; e.g.:\n <d-code language="python">zeros = np.zeros(shape)</d-code>.');
        return;
      }
      const language = prism.languages[this.languageName];
      if (language == undefined) {
        console.warn(`Distill does not yet support highlighting your code block in "${this.languageName}'.`);
        return;
      }

      let content = this.textContent;
      const codeTag = this.shadowRoot.querySelector('#code-container');

      if (this.hasAttribute('block')) {
        // normalize the tab indents
        content = content.replace(/\n/, '');
        const tabs = content.match(/\s*/);
        content = content.replace(new RegExp('\n' + tabs, 'g'), '\n');
        content = content.trim();
        // wrap code block in pre tag if needed
        if (codeTag.parentNode instanceof ShadowRoot) {
          const preTag = document.createElement('pre');
          this.shadowRoot.removeChild(codeTag);
          preTag.appendChild(codeTag);
          this.shadowRoot.appendChild(preTag);
        }

      }

      codeTag.className = `language-${this.languageName}`;
      codeTag.innerHTML = prism.highlight(content, language);
    }

  }

  // Copyright 2018 The Distill Template Authors

  const T$5 = Template('d-footnote', `
<style>

d-math[block] {
  display: block;
}

:host {
  font-size: 0.75rem;
}

sup {
  line-height: 1rem;
  font-size: 0.75rem;
  position: relative;
  top: -.5rem;
  vertical-align: baseline;
}

span {
  color: hsla(206, 90%, 20%, 0.7);
  cursor: default;
}

.footnote-container {
  padding: 10px;
}

</style>

<sup>
  <span id="fn-" data-hover-ref=""></span>
</sup>

<d-hover-box>
  <div class="footnote-container">
    <slot id="slot"></slot>
  </div>
</d-hover-box>

`);

  class Footnote extends T$5(HTMLElement) {

    constructor() {
      super();

      const options = {childList: true, characterData: true, subtree: true};
      const observer = new MutationObserver(this.notify);
      observer.observe(this, options);
    }

    notify() {
      const options = { detail: this, bubbles: true };
      const event = new CustomEvent('onFootnoteChanged', options);
      document.dispatchEvent(event);
    }

    connectedCallback() {
      // listen and notify about changes to slotted content
      // const slot = this.shadowRoot.querySelector('#slot');
      // console.warn(slot.textContent);
      // slot.addEventListener('slotchange', this.notify);
      this.hoverBox = this.root.querySelector('d-hover-box');
      window.customElements.whenDefined('d-hover-box').then(() => {
        this.hoverBox.listen(this);
      });
      // create numeric ID
      Footnote.currentFootnoteId += 1;
      const IdString = Footnote.currentFootnoteId.toString();
      this.root.host.id = 'd-footnote-' + IdString;

      // set up hidden hover box
      const id = 'dt-fn-hover-box-' + IdString;
      this.hoverBox.id = id;

      // set up visible footnote marker
      const span = this.root.querySelector('#fn-');
      span.setAttribute('id', 'fn-' + IdString);
      span.setAttribute('data-hover-ref', id);
      span.textContent = IdString;
    }

  }

  Footnote.currentFootnoteId = 0;

  // Copyright 2018 The Distill Template Authors

  const T$6 = Template('d-footnote-list', `
<style>

d-footnote-list {
  contain: layout style;
}

d-footnote-list > * {
  grid-column: text;
}

d-footnote-list a.footnote-backlink {
  color: rgba(0,0,0,0.3);
  padding-left: 0.5em;
}

</style>

<h3>Footnotes</h3>
<ol></ol>
`, false);

  class FootnoteList extends T$6(HTMLElement) {

    connectedCallback() {
      super.connectedCallback();

      this.list = this.root.querySelector('ol');
      // footnotes list is initially hidden
      this.root.style.display = 'none';
      // look through document and register existing footnotes
      // Store.subscribeTo('footnotes', (footnote) => {
      //   this.renderFootnote(footnote);
      // });
    }

    // TODO: could optimize this to accept individual footnotes?
    set footnotes(footnotes) {
      this.list.innerHTML = '';
      if (footnotes.length) {
        // ensure footnote list is visible
        this.root.style.display = '';

        for (const footnote of footnotes) {
          // construct and append list item to show footnote
          const listItem = document.createElement('li');
          listItem.id = footnote.id + '-listing';
          listItem.innerHTML = footnote.innerHTML;

          const backlink = document.createElement('a');
          backlink.setAttribute('class', 'footnote-backlink');
          backlink.textContent = '[↩]';
          backlink.href = '#' + footnote.id;

          listItem.appendChild(backlink);
          this.list.appendChild(listItem);
        }
      } else {
        // ensure footnote list is invisible
        this.root.style.display = 'none';
      }
    }

  }

  // Copyright 2018 The Distill Template Authors

  const T$7 = Template('d-hover-box', `
<style>

:host {
  position: absolute;
  width: 100%;
  left: 0px;
  z-index: 10000;
  display: none;
  white-space: normal
}

.container {
  position: relative;
  width: 704px;
  max-width: 100vw;
  margin: 0 auto;
}

.panel {
  position: absolute;
  font-size: 1rem;
  line-height: 1.5em;
  top: 0;
  left: 0;
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: rgba(250, 250, 250, 0.95);
  box-shadow: 0 0 7px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  box-sizing: border-box;

  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

</style>

<div class="container">
  <div class="panel">
    <slot></slot>
  </div>
</div>
`);

  class HoverBox extends T$7(HTMLElement) {

    constructor() {
      super();
    }

    connectedCallback() {

    }

    listen(element) {
      // console.log(element)
      this.bindDivEvents(this);
      this.bindTriggerEvents(element);
      // this.style.display = "block";
    }

    bindDivEvents(element) {
      // For mice, same behavior as hovering on links
      element.addEventListener('mouseover', () => {
        if (!this.visible) this.showAtNode(element);
        this.stopTimeout();
      });
      element.addEventListener('mouseout', () => {
        this.extendTimeout(500);
      });
      // Don't trigger body touchstart event when touching within box
      element.addEventListener('touchstart', (event) => {
        event.stopPropagation();
      }, {passive: true});
      // Close box when touching outside box
      document.body.addEventListener('touchstart', () => {
        this.hide();
      }, {passive: true});
    }

    bindTriggerEvents(node) {
      node.addEventListener('mouseover', () => {
        if (!this.visible) {
          this.showAtNode(node);
        }
        this.stopTimeout();
      });

      node.addEventListener('mouseout', () => {
        this.extendTimeout(300);
      });

      node.addEventListener('touchstart', (event) => {
        if (this.visible) {
          this.hide();
        } else {
          this.showAtNode(node);
        }
        // Don't trigger body touchstart event when touching link
        event.stopPropagation();
      }, {passive: true});
    }

    show(position) {
      this.visible = true;
      this.style.display = 'block';
      // 10px extra offset from element
      this.style.top = Math.round(position[1] + 10) + 'px';
    }

    showAtNode(node) {
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetTop
      const bbox = node.getBoundingClientRect();
      this.show([node.offsetLeft + bbox.width, node.offsetTop + bbox.height]);
    }

    hide() {
      this.visible = false;
      this.style.display = 'none';
      this.stopTimeout();
    }

    stopTimeout() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
    }

    extendTimeout(time) {
      this.stopTimeout();
      this.timeout = setTimeout(() => {
        this.hide();
      }, time);
    }

  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  class Title extends HTMLElement {
    static get is() { return 'd-title'; }
  }

  // Copyright 2018 The Distill Template Authors

  const T$8 = Template('d-references', `
<style>
d-references {
  display: block;
}
</style>
`, false);

  class References extends T$8(HTMLElement) {

  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  class TOC extends HTMLElement {

    static get is() { return 'd-toc'; }

    connectedCallback() {
      if (!this.getAttribute('prerendered')) {
        window.onload = () => {
          const article = document.querySelector('article');
          const headings = article.querySelectorAll('h1, h2');
          renderTOC(this, headings);
        };
      }
    }

  }

  function renderTOC(element, headings) {

    let ToC =`
  <style>

  d-toc {
    contain: layout style;
    display: block;
    grid-column: text;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  d-toc ol {
    margin-top: 0.5rem;
    list-style-type: none;
    counter-reset: item;
    margin: 0;
    padding: 0;
  }
  
  d-toc ol > li {
    display: table;
    counter-increment: item;
    margin-bottom: 0.6em;
  }
  
  d-toc ol > li::before {
    content: counters(item, ".") " ";
    display: table-cell;
    padding-right: 0.6em;    
  }
  
  d-toc li ol > li {
    margin: 0;
  }
  
  d-toc li ol > li::before {
    content: counters(item, ".") " ";
  }

  d-toc a {
    border-bottom: none;
    text-decoration: none;
  }

  d-toc .toc-header {
    font-size: 1.5rem;
    font-weight: bold;
    padding-bottom: 1rem;
  }

  </style>
  <nav role="navigation" class="table-of-contents">
  <p class="toc-header">Contents</p>
  <ol>`;

    let isFirst = true;
    for (const el of headings) {
      // should element be included in TOC?
      const isInTitle = el.parentElement.tagName == 'D-TITLE';
      const isException = el.getAttribute('no-toc');
      const tagName = el.tagName;
      if (isInTitle || isException) continue;
      // create TOC entry
      const title = el.textContent;
      const link = '#' + el.getAttribute('id');

      let newLine = '<a href="' + link + '">' + title + '</a>';
      if (tagName === 'H2') {
        newLine = '<li><b>' + newLine + '</b><ol>';
        if (isFirst) {
          isFirst = false;
        } else {
          newLine = '</ol></li>' + newLine;
        }
      } else {
        // newLine += '<br>';
        newLine = '<li>' + newLine + '</li>';
      }
      ToC += newLine;

    }

    ToC += '</ol></nav>';
    element.innerHTML = ToC;
  }

  // Copyright 2018 The Distill Template Authors
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //      http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  // Figure
  //
  // d-figure provides a state-machine of visibility events:
  //
  //                         scroll out of view
  //                         +----------------+
  //   *do work here*        |                |
  // +----------------+    +-+---------+    +-v---------+
  // | ready          +----> onscreen  |    | offscreen |
  // +----------------+    +---------^-+    +---------+-+
  //                                 |                |
  //                                 +----------------+
  //                                  scroll into view
  //

  class Figure extends HTMLElement {

    static get is() { return 'd-figure'; }

    static get readyQueue() {
      if (!Figure._readyQueue) {
        Figure._readyQueue = [];
      }
      return Figure._readyQueue;
    }

    static addToReadyQueue(figure) {
      if (Figure.readyQueue.indexOf(figure) === -1) {
        Figure.readyQueue.push(figure);
        Figure.runReadyQueue();
      }
    }

    static runReadyQueue() {
      // console.log("Checking to run readyQueue, length: " + Figure.readyQueue.length + ", scrolling: " + Figure.isScrolling);
      // if (Figure.isScrolling) return;
      // console.log("Running ready Queue");
      const figure = Figure.readyQueue
        .sort((a,b) => a._seenOnScreen - b._seenOnScreen )
        .filter((figure) => !figure._ready)
        .pop();
      if (figure) {
        figure.ready();
        requestAnimationFrame(Figure.runReadyQueue);
      }

    }

    constructor() {
      super();
      // debugger
      this._ready = false;
      this._onscreen = false;
      this._offscreen = true;
    }

    connectedCallback() {
      this.loadsWhileScrolling = this.hasAttribute('loadsWhileScrolling');
      Figure.marginObserver.observe(this);
      Figure.directObserver.observe(this);
    }

    disconnectedCallback() {
      Figure.marginObserver.unobserve(this);
      Figure.directObserver.unobserve(this);
    }

    // We use two separate observers:
    // One with an extra 1000px margin to warn if the viewpoint gets close,
    // And one for the actual on/off screen events

    static get marginObserver() {
      if (!Figure._marginObserver) {
        // if (!('IntersectionObserver' in window)) {
        //   throw new Error('no interscetionobbserver!');
        // }
        const viewportHeight = window.innerHeight;
        const margin = Math.floor(2 * viewportHeight);
        const options = {rootMargin: margin + 'px 0px ' + margin + 'px 0px', threshold: 0.01};
        const callback = Figure.didObserveMarginIntersection;
        const observer = new IntersectionObserver(callback, options);
        Figure._marginObserver = observer;
      }
      return Figure._marginObserver;
    }

    static didObserveMarginIntersection(entries) {
      for (const entry of entries) {
        const figure = entry.target;
        if (entry.isIntersecting && !figure._ready) {
          Figure.addToReadyQueue(figure);
        }
      }
    }

    static get directObserver() {
      if (!Figure._directObserver) {
        Figure._directObserver = new IntersectionObserver(
          Figure.didObserveDirectIntersection, {
            rootMargin: '0px', threshold: [0, 1.0],
          }
        );
      }
      return Figure._directObserver;
    }

    static didObserveDirectIntersection(entries) {
      for (const entry of entries) {
        const figure = entry.target;
        if (entry.isIntersecting) {
          figure._seenOnScreen = new Date();
          // if (!figure._ready) { figure.ready(); }
          if (figure._offscreen) { figure.onscreen(); }
        } else {
          if (figure._onscreen) { figure.offscreen(); }
        }
      }
    }

    // Notify listeners that registered late, too:

    addEventListener(eventName, callback) {
      super.addEventListener(eventName, callback);
      // if we had already dispatched something while presumingly no one was listening, we do so again
      // debugger
      if (eventName === 'ready') {
        if (Figure.readyQueue.indexOf(this) !== -1) {
          this._ready = false;
          Figure.runReadyQueue();
        }
      }
      if (eventName === 'onscreen') {
        this.onscreen();
      }
    }

    // Custom Events

    ready() {
      // debugger
      this._ready = true;
      Figure.marginObserver.unobserve(this);
      const event = new CustomEvent('ready');
      this.dispatchEvent(event);
    }

    onscreen() {
      this._onscreen = true;
      this._offscreen = false;
      const event = new CustomEvent('onscreen');
      this.dispatchEvent(event);
    }

    offscreen() {
      this._onscreen = false;
      this._offscreen = true;
      const event = new CustomEvent('offscreen');
      this.dispatchEvent(event);
    }

  }

  if (typeof window !== 'undefined') {

    Figure.isScrolling = false;
    let timeout;
    const resetTimer = () => {
      Figure.isScrolling = true;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        Figure.isScrolling = false;
        Figure.runReadyQueue();
      }, 500);
    };
    window.addEventListener('scroll', resetTimer, true);

  }

  const T$9 = Template('d-figure-caption', `
<style>
  :host {
  /*
    font-size: 1.25rem;
    line-height: 1.6em;
    color: rgba(0, 0, 0, 0.7);
    */
    /*-webkit-font-smoothing: antialiased;*/
    display: block;
    text-align: center;
  }

  :host .figure-caption {
    counter-increment: figure-caption;
  }

  :host .figure-caption::after {
    content: " " counter(figure-caption) ":";
  }

  ::slotted(p) {
    margin-top: 0;
    margin-bottom: 1em;
    grid-column: text;
  }
  ${body('d-abstract')}
</style>

<span class="figure-caption">Figure</span>
<slot></slot>
`);

  class FigureCaption extends T$9(HTMLElement) {

  }

  // Copyright 2018 The Distill Template Authors

  // This overlay is not secure.
  // It is only meant as a social deterrent.

  const productionHostname = 'distill.pub';
  const T$a = Template('d-interstitial', `
<style>

.overlay {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: white;

  opacity: 1;
  visibility: visible;

  display: flex;
  flex-flow: column;
  justify-content: center;
  z-index: 2147483647 /* MaxInt32 */

}

.container {
  position: relative;
  margin-left: auto;
  margin-right: auto;
  max-width: 420px;
  padding: 2em;
}

h1 {
  text-decoration: underline;
  text-decoration-color: hsl(0,100%,40%);
  -webkit-text-decoration-color: hsl(0,100%,40%);
  margin-bottom: 1em;
  line-height: 1.5em;
}

input[type="password"] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  -webkit-box-shadow: none;
  -moz-box-shadow: none;
  box-shadow: none;
  -webkit-border-radius: none;
  -moz-border-radius: none;
  -ms-border-radius: none;
  -o-border-radius: none;
  border-radius: none;
  outline: none;

  font-size: 18px;
  background: none;
  width: 25%;
  padding: 10px;
  border: none;
  border-bottom: solid 2px #999;
  transition: border .3s;
}

input[type="password"]:focus {
  border-bottom: solid 2px #333;
}

input[type="password"].wrong {
  border-bottom: solid 2px hsl(0,100%,40%);
}

p small {
  color: #888;
}

.logo {
  position: relative;
  font-size: 1.5em;
  margin-bottom: 3em;
}

.logo svg {
  width: 36px;
  position: relative;
  top: 6px;
  margin-right: 2px;
}

.logo svg path {
  fill: none;
  stroke: black;
  stroke-width: 2px;
}

</style>

<div class="overlay">
  <div class="container">
    <h1>This article is in review.</h1>
    <p>Do not share this URL or the contents of this article. Thank you!</p>
    <input id="interstitial-password-input" type="password" name="password" autofocus/>
    <p><small>Enter the password we shared with you as part of the review process to view the article.</small></p>
  </div>
</div>
`);

  class Interstitial extends T$a(HTMLElement) {

    connectedCallback() {
      if (this.shouldRemoveSelf()) {
        this.parentElement.removeChild(this);
      } else {
        const passwordInput = this.root.querySelector('#interstitial-password-input');
        passwordInput.oninput = (event) => this.passwordChanged(event);
      }
    }

    passwordChanged(event) {
      const entered = event.target.value;
      if (entered === this.password) {
        console.log('Correct password entered.');
        this.parentElement.removeChild(this);
        if (typeof(Storage) !== 'undefined') {
          console.log('Saved that correct password was entered.');
          localStorage.setItem(this.localStorageIdentifier(), 'true');
        }
      }
    }

    shouldRemoveSelf() {
      // should never be visible in production
      if (window && window.location.hostname === productionHostname) {
        console.warn('Interstitial found on production, hiding it.');
        return true
      }
      // should only have to enter password once
      if (typeof(Storage) !== 'undefined') {
        if (localStorage.getItem(this.localStorageIdentifier()) === 'true') {
          console.log('Loaded that correct password was entered before; skipping interstitial.');
          return true;
        }
      }
      // otherwise, leave visible
      return false;
    }

    localStorageIdentifier() {
      const prefix = 'distill-drafts';
      const suffix = 'interstitial-password-correct';
      return prefix + (window ? window.location.pathname : '-') + suffix
    }

  }

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function bisector(compare) {
    if (compare.length === 1) compare = ascendingComparator(compare);
    return {
      left: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      },
      right: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) > 0) hi = mid;
          else lo = mid + 1;
        }
        return lo;
      }
    };
  }

  function ascendingComparator(f) {
    return function(d, x) {
      return ascending(f(d), x);
    };
  }

  var ascendingBisect = bisector(ascending);
  var bisectRight = ascendingBisect.right;

  function range(start, stop, step) {
    start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

    var i = -1,
        n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
        range = new Array(n);

    while (++i < n) {
      range[i] = start + i * step;
    }

    return range;
  }

  var e10 = Math.sqrt(50),
      e5 = Math.sqrt(10),
      e2 = Math.sqrt(2);

  function ticks(start, stop, count) {
    var reverse,
        i = -1,
        n,
        ticks,
        step;

    stop = +stop, start = +start, count = +count;
    if (start === stop && count > 0) return [start];
    if (reverse = stop < start) n = start, start = stop, stop = n;
    if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

    if (step > 0) {
      start = Math.ceil(start / step);
      stop = Math.floor(stop / step);
      ticks = new Array(n = Math.ceil(stop - start + 1));
      while (++i < n) ticks[i] = (start + i) * step;
    } else {
      start = Math.floor(start * step);
      stop = Math.ceil(stop * step);
      ticks = new Array(n = Math.ceil(start - stop + 1));
      while (++i < n) ticks[i] = (start - i) / step;
    }

    if (reverse) ticks.reverse();

    return ticks;
  }

  function tickIncrement(start, stop, count) {
    var step = (stop - start) / Math.max(0, count),
        power = Math.floor(Math.log(step) / Math.LN10),
        error = step / Math.pow(10, power);
    return power >= 0
        ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
        : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
  }

  function tickStep(start, stop, count) {
    var step0 = Math.abs(stop - start) / Math.max(0, count),
        step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
        error = step0 / step1;
    if (error >= e10) step1 *= 10;
    else if (error >= e5) step1 *= 5;
    else if (error >= e2) step1 *= 2;
    return stop < start ? -step1 : step1;
  }

  function initRange(domain, range) {
    switch (arguments.length) {
      case 0: break;
      case 1: this.range(domain); break;
      default: this.range(range).domain(domain); break;
    }
    return this;
  }

  function define(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }

  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  function Color() {}

  var darker = 0.7;
  var brighter = 1 / darker;

  var reI = "\\s*([+-]?\\d+)\\s*",
      reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
      reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
      reHex = /^#([0-9a-f]{3,8})$/,
      reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
      reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
      reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
      reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
      reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
      reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

  var named = {
    aliceblue: 0xf0f8ff,
    antiquewhite: 0xfaebd7,
    aqua: 0x00ffff,
    aquamarine: 0x7fffd4,
    azure: 0xf0ffff,
    beige: 0xf5f5dc,
    bisque: 0xffe4c4,
    black: 0x000000,
    blanchedalmond: 0xffebcd,
    blue: 0x0000ff,
    blueviolet: 0x8a2be2,
    brown: 0xa52a2a,
    burlywood: 0xdeb887,
    cadetblue: 0x5f9ea0,
    chartreuse: 0x7fff00,
    chocolate: 0xd2691e,
    coral: 0xff7f50,
    cornflowerblue: 0x6495ed,
    cornsilk: 0xfff8dc,
    crimson: 0xdc143c,
    cyan: 0x00ffff,
    darkblue: 0x00008b,
    darkcyan: 0x008b8b,
    darkgoldenrod: 0xb8860b,
    darkgray: 0xa9a9a9,
    darkgreen: 0x006400,
    darkgrey: 0xa9a9a9,
    darkkhaki: 0xbdb76b,
    darkmagenta: 0x8b008b,
    darkolivegreen: 0x556b2f,
    darkorange: 0xff8c00,
    darkorchid: 0x9932cc,
    darkred: 0x8b0000,
    darksalmon: 0xe9967a,
    darkseagreen: 0x8fbc8f,
    darkslateblue: 0x483d8b,
    darkslategray: 0x2f4f4f,
    darkslategrey: 0x2f4f4f,
    darkturquoise: 0x00ced1,
    darkviolet: 0x9400d3,
    deeppink: 0xff1493,
    deepskyblue: 0x00bfff,
    dimgray: 0x696969,
    dimgrey: 0x696969,
    dodgerblue: 0x1e90ff,
    firebrick: 0xb22222,
    floralwhite: 0xfffaf0,
    forestgreen: 0x228b22,
    fuchsia: 0xff00ff,
    gainsboro: 0xdcdcdc,
    ghostwhite: 0xf8f8ff,
    gold: 0xffd700,
    goldenrod: 0xdaa520,
    gray: 0x808080,
    green: 0x008000,
    greenyellow: 0xadff2f,
    grey: 0x808080,
    honeydew: 0xf0fff0,
    hotpink: 0xff69b4,
    indianred: 0xcd5c5c,
    indigo: 0x4b0082,
    ivory: 0xfffff0,
    khaki: 0xf0e68c,
    lavender: 0xe6e6fa,
    lavenderblush: 0xfff0f5,
    lawngreen: 0x7cfc00,
    lemonchiffon: 0xfffacd,
    lightblue: 0xadd8e6,
    lightcoral: 0xf08080,
    lightcyan: 0xe0ffff,
    lightgoldenrodyellow: 0xfafad2,
    lightgray: 0xd3d3d3,
    lightgreen: 0x90ee90,
    lightgrey: 0xd3d3d3,
    lightpink: 0xffb6c1,
    lightsalmon: 0xffa07a,
    lightseagreen: 0x20b2aa,
    lightskyblue: 0x87cefa,
    lightslategray: 0x778899,
    lightslategrey: 0x778899,
    lightsteelblue: 0xb0c4de,
    lightyellow: 0xffffe0,
    lime: 0x00ff00,
    limegreen: 0x32cd32,
    linen: 0xfaf0e6,
    magenta: 0xff00ff,
    maroon: 0x800000,
    mediumaquamarine: 0x66cdaa,
    mediumblue: 0x0000cd,
    mediumorchid: 0xba55d3,
    mediumpurple: 0x9370db,
    mediumseagreen: 0x3cb371,
    mediumslateblue: 0x7b68ee,
    mediumspringgreen: 0x00fa9a,
    mediumturquoise: 0x48d1cc,
    mediumvioletred: 0xc71585,
    midnightblue: 0x191970,
    mintcream: 0xf5fffa,
    mistyrose: 0xffe4e1,
    moccasin: 0xffe4b5,
    navajowhite: 0xffdead,
    navy: 0x000080,
    oldlace: 0xfdf5e6,
    olive: 0x808000,
    olivedrab: 0x6b8e23,
    orange: 0xffa500,
    orangered: 0xff4500,
    orchid: 0xda70d6,
    palegoldenrod: 0xeee8aa,
    palegreen: 0x98fb98,
    paleturquoise: 0xafeeee,
    palevioletred: 0xdb7093,
    papayawhip: 0xffefd5,
    peachpuff: 0xffdab9,
    peru: 0xcd853f,
    pink: 0xffc0cb,
    plum: 0xdda0dd,
    powderblue: 0xb0e0e6,
    purple: 0x800080,
    rebeccapurple: 0x663399,
    red: 0xff0000,
    rosybrown: 0xbc8f8f,
    royalblue: 0x4169e1,
    saddlebrown: 0x8b4513,
    salmon: 0xfa8072,
    sandybrown: 0xf4a460,
    seagreen: 0x2e8b57,
    seashell: 0xfff5ee,
    sienna: 0xa0522d,
    silver: 0xc0c0c0,
    skyblue: 0x87ceeb,
    slateblue: 0x6a5acd,
    slategray: 0x708090,
    slategrey: 0x708090,
    snow: 0xfffafa,
    springgreen: 0x00ff7f,
    steelblue: 0x4682b4,
    tan: 0xd2b48c,
    teal: 0x008080,
    thistle: 0xd8bfd8,
    tomato: 0xff6347,
    turquoise: 0x40e0d0,
    violet: 0xee82ee,
    wheat: 0xf5deb3,
    white: 0xffffff,
    whitesmoke: 0xf5f5f5,
    yellow: 0xffff00,
    yellowgreen: 0x9acd32
  };

  define(Color, color, {
    copy: function(channels) {
      return Object.assign(new this.constructor, this, channels);
    },
    displayable: function() {
      return this.rgb().displayable();
    },
    hex: color_formatHex, // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });

  function color_formatHex() {
    return this.rgb().formatHex();
  }

  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }

  function color_formatRgb() {
    return this.rgb().formatRgb();
  }

  function color(format) {
    var m, l;
    format = (format + "").trim().toLowerCase();
    return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
        : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
        : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
        : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
        : null) // invalid hex
        : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
        : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
        : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
        : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
        : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
        : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
        : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
        : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
        : null;
  }

  function rgbn(n) {
    return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
  }

  function rgba(r, g, b, a) {
    if (a <= 0) r = g = b = NaN;
    return new Rgb(r, g, b, a);
  }

  function rgbConvert(o) {
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Rgb;
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }

  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }

  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }

  define(Rgb, rgb, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb: function() {
      return this;
    },
    displayable: function() {
      return (-0.5 <= this.r && this.r < 255.5)
          && (-0.5 <= this.g && this.g < 255.5)
          && (-0.5 <= this.b && this.b < 255.5)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex, // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));

  function rgb_formatHex() {
    return "#" + hex(this.r) + hex(this.g) + hex(this.b);
  }

  function rgb_formatRgb() {
    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "rgb(" : "rgba(")
        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
        + (a === 1 ? ")" : ", " + a + ")");
  }

  function hex(value) {
    value = Math.max(0, Math.min(255, Math.round(value) || 0));
    return (value < 16 ? "0" : "") + value.toString(16);
  }

  function hsla(h, s, l, a) {
    if (a <= 0) h = s = l = NaN;
    else if (l <= 0 || l >= 1) h = s = NaN;
    else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a);
  }

  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Hsl;
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        min = Math.min(r, g, b),
        max = Math.max(r, g, b),
        h = NaN,
        s = max - min,
        l = (max + min) / 2;
    if (s) {
      if (r === max) h = (g - b) / s + (g < b) * 6;
      else if (g === max) h = (b - r) / s + 2;
      else h = (r - g) / s + 4;
      s /= l < 0.5 ? max + min : 2 - max - min;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }

  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }

  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define(Hsl, hsl, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb: function() {
      var h = this.h % 360 + (this.h < 0) * 360,
          s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
          l = this.l,
          m2 = l + (l < 0.5 ? l : 1 - l) * s,
          m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    displayable: function() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s))
          && (0 <= this.l && this.l <= 1)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl: function() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "hsl(" : "hsla(")
          + (this.h || 0) + ", "
          + (this.s || 0) * 100 + "%, "
          + (this.l || 0) * 100 + "%"
          + (a === 1 ? ")" : ", " + a + ")");
    }
  }));

  /* From FvD 13.37, CSS Color Module Level 3 */
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60
        : h < 180 ? m2
        : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
        : m1) * 255;
  }

  var deg2rad = Math.PI / 180;
  var rad2deg = 180 / Math.PI;

  // https://observablehq.com/@mbostock/lab-and-rgb
  var K = 18,
      Xn = 0.96422,
      Yn = 1,
      Zn = 0.82521,
      t0 = 4 / 29,
      t1 = 6 / 29,
      t2 = 3 * t1 * t1,
      t3 = t1 * t1 * t1;

  function labConvert(o) {
    if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
    if (o instanceof Hcl) return hcl2lab(o);
    if (!(o instanceof Rgb)) o = rgbConvert(o);
    var r = rgb2lrgb(o.r),
        g = rgb2lrgb(o.g),
        b = rgb2lrgb(o.b),
        y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
    if (r === g && g === b) x = z = y; else {
      x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
      z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
    }
    return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
  }

  function lab(l, a, b, opacity) {
    return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
  }

  function Lab(l, a, b, opacity) {
    this.l = +l;
    this.a = +a;
    this.b = +b;
    this.opacity = +opacity;
  }

  define(Lab, lab, extend(Color, {
    brighter: function(k) {
      return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
    },
    darker: function(k) {
      return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
    },
    rgb: function() {
      var y = (this.l + 16) / 116,
          x = isNaN(this.a) ? y : y + this.a / 500,
          z = isNaN(this.b) ? y : y - this.b / 200;
      x = Xn * lab2xyz(x);
      y = Yn * lab2xyz(y);
      z = Zn * lab2xyz(z);
      return new Rgb(
        lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
        lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
        lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
        this.opacity
      );
    }
  }));

  function xyz2lab(t) {
    return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
  }

  function lab2xyz(t) {
    return t > t1 ? t * t * t : t2 * (t - t0);
  }

  function lrgb2rgb(x) {
    return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  }

  function rgb2lrgb(x) {
    return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }

  function hclConvert(o) {
    if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
    if (!(o instanceof Lab)) o = labConvert(o);
    if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0 < o.l && o.l < 100 ? 0 : NaN, o.l, o.opacity);
    var h = Math.atan2(o.b, o.a) * rad2deg;
    return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
  }

  function hcl(h, c, l, opacity) {
    return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
  }

  function Hcl(h, c, l, opacity) {
    this.h = +h;
    this.c = +c;
    this.l = +l;
    this.opacity = +opacity;
  }

  function hcl2lab(o) {
    if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
    var h = o.h * deg2rad;
    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
  }

  define(Hcl, hcl, extend(Color, {
    brighter: function(k) {
      return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
    },
    darker: function(k) {
      return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
    },
    rgb: function() {
      return hcl2lab(this).rgb();
    }
  }));

  var A = -0.14861,
      B = +1.78277,
      C = -0.29227,
      D = -0.90649,
      E = +1.97294,
      ED = E * D,
      EB = E * B,
      BC_DA = B * C - D * A;

  function cubehelixConvert(o) {
    if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Rgb)) o = rgbConvert(o);
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
        bl = b - l,
        k = (E * (g - l) - C * bl) / D,
        s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
        h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
    return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
  }

  function cubehelix(h, s, l, opacity) {
    return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
  }

  function Cubehelix(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define(Cubehelix, cubehelix, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
    },
    rgb: function() {
      var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
          l = +this.l,
          a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
          cosh = Math.cos(h),
          sinh = Math.sin(h);
      return new Rgb(
        255 * (l + a * (A * cosh + B * sinh)),
        255 * (l + a * (C * cosh + D * sinh)),
        255 * (l + a * (E * cosh)),
        this.opacity
      );
    }
  }));

  function constant(x) {
    return function() {
      return x;
    };
  }

  function linear(a, d) {
    return function(t) {
      return a + t * d;
    };
  }

  function exponential(a, b, y) {
    return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
      return Math.pow(a + t * b, y);
    };
  }

  function gamma(y) {
    return (y = +y) === 1 ? nogamma : function(a, b) {
      return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
    };
  }

  function nogamma(a, b) {
    var d = b - a;
    return d ? linear(a, d) : constant(isNaN(a) ? b : a);
  }

  var rgb$1 = (function rgbGamma(y) {
    var color = gamma(y);

    function rgb$1(start, end) {
      var r = color((start = rgb(start)).r, (end = rgb(end)).r),
          g = color(start.g, end.g),
          b = color(start.b, end.b),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.r = r(t);
        start.g = g(t);
        start.b = b(t);
        start.opacity = opacity(t);
        return start + "";
      };
    }

    rgb$1.gamma = rgbGamma;

    return rgb$1;
  })(1);

  function numberArray(a, b) {
    if (!b) b = [];
    var n = a ? Math.min(b.length, a.length) : 0,
        c = b.slice(),
        i;
    return function(t) {
      for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
      return c;
    };
  }

  function isNumberArray(x) {
    return ArrayBuffer.isView(x) && !(x instanceof DataView);
  }

  function genericArray(a, b) {
    var nb = b ? b.length : 0,
        na = a ? Math.min(nb, a.length) : 0,
        x = new Array(na),
        c = new Array(nb),
        i;

    for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
    for (; i < nb; ++i) c[i] = b[i];

    return function(t) {
      for (i = 0; i < na; ++i) c[i] = x[i](t);
      return c;
    };
  }

  function date(a, b) {
    var d = new Date;
    return a = +a, b = +b, function(t) {
      return d.setTime(a * (1 - t) + b * t), d;
    };
  }

  function interpolateNumber(a, b) {
    return a = +a, b = +b, function(t) {
      return a * (1 - t) + b * t;
    };
  }

  function object(a, b) {
    var i = {},
        c = {},
        k;

    if (a === null || typeof a !== "object") a = {};
    if (b === null || typeof b !== "object") b = {};

    for (k in b) {
      if (k in a) {
        i[k] = interpolate(a[k], b[k]);
      } else {
        c[k] = b[k];
      }
    }

    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }

  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
      reB = new RegExp(reA.source, "g");

  function zero(b) {
    return function() {
      return b;
    };
  }

  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }

  function string(a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
        am, // current match in a
        bm, // current match in b
        bs, // string preceding current number in b, if any
        i = -1, // index in s
        s = [], // string constants and placeholders
        q = []; // number interpolators

    // Coerce inputs to strings.
    a = a + "", b = b + "";

    // Interpolate pairs of numbers in a & b.
    while ((am = reA.exec(a))
        && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) { // a string precedes the next number in b
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
        if (s[i]) s[i] += bm; // coalesce with previous string
        else s[++i] = bm;
      } else { // interpolate non-matching numbers
        s[++i] = null;
        q.push({i: i, x: interpolateNumber(am, bm)});
      }
      bi = reB.lastIndex;
    }

    // Add remains of b.
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }

    // Special optimization for only a single match.
    // Otherwise, interpolate each of the numbers and rejoin the string.
    return s.length < 2 ? (q[0]
        ? one(q[0].x)
        : zero(b))
        : (b = q.length, function(t) {
            for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
            return s.join("");
          });
  }

  function interpolate(a, b) {
    var t = typeof b, c;
    return b == null || t === "boolean" ? constant(b)
        : (t === "number" ? interpolateNumber
        : t === "string" ? ((c = color(b)) ? (b = c, rgb$1) : string)
        : b instanceof color ? rgb$1
        : b instanceof Date ? date
        : isNumberArray(b) ? numberArray
        : Array.isArray(b) ? genericArray
        : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
        : interpolateNumber)(a, b);
  }

  function interpolateRound(a, b) {
    return a = +a, b = +b, function(t) {
      return Math.round(a * (1 - t) + b * t);
    };
  }

  function constant$1(x) {
    return function() {
      return x;
    };
  }

  function number(x) {
    return +x;
  }

  var unit = [0, 1];

  function identity(x) {
    return x;
  }

  function normalize(a, b) {
    return (b -= (a = +a))
        ? function(x) { return (x - a) / b; }
        : constant$1(isNaN(b) ? NaN : 0.5);
  }

  function clamper(a, b) {
    var t;
    if (a > b) t = a, a = b, b = t;
    return function(x) { return Math.max(a, Math.min(b, x)); };
  }

  // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
  // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
  function bimap(domain, range, interpolate) {
    var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
    if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
    else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
    return function(x) { return r0(d0(x)); };
  }

  function polymap(domain, range, interpolate) {
    var j = Math.min(domain.length, range.length) - 1,
        d = new Array(j),
        r = new Array(j),
        i = -1;

    // Reverse descending domains.
    if (domain[j] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }

    while (++i < j) {
      d[i] = normalize(domain[i], domain[i + 1]);
      r[i] = interpolate(range[i], range[i + 1]);
    }

    return function(x) {
      var i = bisectRight(domain, x, 1, j) - 1;
      return r[i](d[i](x));
    };
  }

  function copy(source, target) {
    return target
        .domain(source.domain())
        .range(source.range())
        .interpolate(source.interpolate())
        .clamp(source.clamp())
        .unknown(source.unknown());
  }

  function transformer() {
    var domain = unit,
        range = unit,
        interpolate$1 = interpolate,
        transform,
        untransform,
        unknown,
        clamp = identity,
        piecewise,
        output,
        input;

    function rescale() {
      var n = Math.min(domain.length, range.length);
      if (clamp !== identity) clamp = clamper(domain[0], domain[n - 1]);
      piecewise = n > 2 ? polymap : bimap;
      output = input = null;
      return scale;
    }

    function scale(x) {
      return isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$1)))(transform(clamp(x)));
    }

    scale.invert = function(y) {
      return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
    };

    scale.domain = function(_) {
      return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
    };

    scale.range = function(_) {
      return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
    };

    scale.rangeRound = function(_) {
      return range = Array.from(_), interpolate$1 = interpolateRound, rescale();
    };

    scale.clamp = function(_) {
      return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity;
    };

    scale.interpolate = function(_) {
      return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
    };

    scale.unknown = function(_) {
      return arguments.length ? (unknown = _, scale) : unknown;
    };

    return function(t, u) {
      transform = t, untransform = u;
      return rescale();
    };
  }

  function continuous() {
    return transformer()(identity, identity);
  }

  // Computes the decimal coefficient and exponent of the specified number x with
  // significant digits p, where x is positive and p is in [1, 21] or undefined.
  // For example, formatDecimal(1.23) returns ["123", 0].
  function formatDecimal(x, p) {
    if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
    var i, coefficient = x.slice(0, i);

    // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
    // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x.slice(i + 1)
    ];
  }

  function exponent(x) {
    return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
  }

  function formatGroup(grouping, thousands) {
    return function(value, width) {
      var i = value.length,
          t = [],
          j = 0,
          g = grouping[0],
          length = 0;

      while (i > 0 && g > 0) {
        if (length + g + 1 > width) g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width) break;
        g = grouping[j = (j + 1) % grouping.length];
      }

      return t.reverse().join(thousands);
    };
  }

  function formatNumerals(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
  var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

  function formatSpecifier(specifier) {
    if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
    var match;
    return new FormatSpecifier({
      fill: match[1],
      align: match[2],
      sign: match[3],
      symbol: match[4],
      zero: match[5],
      width: match[6],
      comma: match[7],
      precision: match[8] && match[8].slice(1),
      trim: match[9],
      type: match[10]
    });
  }

  formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

  function FormatSpecifier(specifier) {
    this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
    this.align = specifier.align === undefined ? ">" : specifier.align + "";
    this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
    this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
    this.zero = !!specifier.zero;
    this.width = specifier.width === undefined ? undefined : +specifier.width;
    this.comma = !!specifier.comma;
    this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
    this.trim = !!specifier.trim;
    this.type = specifier.type === undefined ? "" : specifier.type + "";
  }

  FormatSpecifier.prototype.toString = function() {
    return this.fill
        + this.align
        + this.sign
        + this.symbol
        + (this.zero ? "0" : "")
        + (this.width === undefined ? "" : Math.max(1, this.width | 0))
        + (this.comma ? "," : "")
        + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
        + (this.trim ? "~" : "")
        + this.type;
  };

  // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
  function formatTrim(s) {
    out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
      switch (s[i]) {
        case ".": i0 = i1 = i; break;
        case "0": if (i0 === 0) i0 = i; i1 = i; break;
        default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
      }
    }
    return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
  }

  var prefixExponent;

  function formatPrefixAuto(x, p) {
    var d = formatDecimal(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1],
        i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
        n = coefficient.length;
    return i === n ? coefficient
        : i > n ? coefficient + new Array(i - n + 1).join("0")
        : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
        : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
  }

  function formatRounded(x, p) {
    var d = formatDecimal(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
        : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
        : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

  var formatTypes = {
    "%": function(x, p) { return (x * 100).toFixed(p); },
    "b": function(x) { return Math.round(x).toString(2); },
    "c": function(x) { return x + ""; },
    "d": function(x) { return Math.round(x).toString(10); },
    "e": function(x, p) { return x.toExponential(p); },
    "f": function(x, p) { return x.toFixed(p); },
    "g": function(x, p) { return x.toPrecision(p); },
    "o": function(x) { return Math.round(x).toString(8); },
    "p": function(x, p) { return formatRounded(x * 100, p); },
    "r": formatRounded,
    "s": formatPrefixAuto,
    "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
    "x": function(x) { return Math.round(x).toString(16); }
  };

  function identity$1(x) {
    return x;
  }

  var map = Array.prototype.map,
      prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

  function formatLocale(locale) {
    var group = locale.grouping === undefined || locale.thousands === undefined ? identity$1 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
        currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
        currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
        decimal = locale.decimal === undefined ? "." : locale.decimal + "",
        numerals = locale.numerals === undefined ? identity$1 : formatNumerals(map.call(locale.numerals, String)),
        percent = locale.percent === undefined ? "%" : locale.percent + "",
        minus = locale.minus === undefined ? "-" : locale.minus + "",
        nan = locale.nan === undefined ? "NaN" : locale.nan + "";

    function newFormat(specifier) {
      specifier = formatSpecifier(specifier);

      var fill = specifier.fill,
          align = specifier.align,
          sign = specifier.sign,
          symbol = specifier.symbol,
          zero = specifier.zero,
          width = specifier.width,
          comma = specifier.comma,
          precision = specifier.precision,
          trim = specifier.trim,
          type = specifier.type;

      // The "n" type is an alias for ",g".
      if (type === "n") comma = true, type = "g";

      // The "" type, and any invalid type, is an alias for ".12~g".
      else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

      // If zero fill is specified, padding goes after sign and before digits.
      if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

      // Compute the prefix and suffix.
      // For SI-prefix, the suffix is lazily computed.
      var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
          suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

      // What format function should we use?
      // Is this an integer type?
      // Can this type generate exponential notation?
      var formatType = formatTypes[type],
          maybeSuffix = /[defgprs%]/.test(type);

      // Set the default precision if not specified,
      // or clamp the specified precision to the supported range.
      // For significant precision, it must be in [1, 21].
      // For fixed precision, it must be in [0, 20].
      precision = precision === undefined ? 6
          : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
          : Math.max(0, Math.min(20, precision));

      function format(value) {
        var valuePrefix = prefix,
            valueSuffix = suffix,
            i, n, c;

        if (type === "c") {
          valueSuffix = formatType(value) + valueSuffix;
          value = "";
        } else {
          value = +value;

          // Determine the sign. -0 is not less than 0, but 1 / -0 is!
          var valueNegative = value < 0 || 1 / value < 0;

          // Perform the initial formatting.
          value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

          // Trim insignificant zeros.
          if (trim) value = formatTrim(value);

          // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
          if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

          // Compute the prefix and suffix.
          valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
          valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

          // Break the formatted value into the integer “value” part that can be
          // grouped, and fractional or exponential “suffix” part that is not.
          if (maybeSuffix) {
            i = -1, n = value.length;
            while (++i < n) {
              if (c = value.charCodeAt(i), 48 > c || c > 57) {
                valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                value = value.slice(0, i);
                break;
              }
            }
          }
        }

        // If the fill character is not "0", grouping is applied before padding.
        if (comma && !zero) value = group(value, Infinity);

        // Compute the padding.
        var length = valuePrefix.length + value.length + valueSuffix.length,
            padding = length < width ? new Array(width - length + 1).join(fill) : "";

        // If the fill character is "0", grouping is applied after padding.
        if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

        // Reconstruct the final output based on the desired alignment.
        switch (align) {
          case "<": value = valuePrefix + value + valueSuffix + padding; break;
          case "=": value = valuePrefix + padding + value + valueSuffix; break;
          case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
          default: value = padding + valuePrefix + value + valueSuffix; break;
        }

        return numerals(value);
      }

      format.toString = function() {
        return specifier + "";
      };

      return format;
    }

    function formatPrefix(specifier, value) {
      var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
          e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
          k = Math.pow(10, -e),
          prefix = prefixes[8 + e / 3];
      return function(value) {
        return f(k * value) + prefix;
      };
    }

    return {
      format: newFormat,
      formatPrefix: formatPrefix
    };
  }

  var locale;
  var format;
  var formatPrefix;

  defaultLocale({
    decimal: ".",
    thousands: ",",
    grouping: [3],
    currency: ["$", ""],
    minus: "-"
  });

  function defaultLocale(definition) {
    locale = formatLocale(definition);
    format = locale.format;
    formatPrefix = locale.formatPrefix;
    return locale;
  }

  function precisionFixed(step) {
    return Math.max(0, -exponent(Math.abs(step)));
  }

  function precisionPrefix(step, value) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
  }

  function precisionRound(step, max) {
    step = Math.abs(step), max = Math.abs(max) - step;
    return Math.max(0, exponent(max) - exponent(step)) + 1;
  }

  function tickFormat(start, stop, count, specifier) {
    var step = tickStep(start, stop, count),
        precision;
    specifier = formatSpecifier(specifier == null ? ",f" : specifier);
    switch (specifier.type) {
      case "s": {
        var value = Math.max(Math.abs(start), Math.abs(stop));
        if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
        return formatPrefix(specifier, value);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
        break;
      }
      case "f":
      case "%": {
        if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
        break;
      }
    }
    return format(specifier);
  }

  function linearish(scale) {
    var domain = scale.domain;

    scale.ticks = function(count) {
      var d = domain();
      return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
    };

    scale.tickFormat = function(count, specifier) {
      var d = domain();
      return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
    };

    scale.nice = function(count) {
      if (count == null) count = 10;

      var d = domain(),
          i0 = 0,
          i1 = d.length - 1,
          start = d[i0],
          stop = d[i1],
          step;

      if (stop < start) {
        step = start, start = stop, stop = step;
        step = i0, i0 = i1, i1 = step;
      }

      step = tickIncrement(start, stop, count);

      if (step > 0) {
        start = Math.floor(start / step) * step;
        stop = Math.ceil(stop / step) * step;
        step = tickIncrement(start, stop, count);
      } else if (step < 0) {
        start = Math.ceil(start * step) / step;
        stop = Math.floor(stop * step) / step;
        step = tickIncrement(start, stop, count);
      }

      if (step > 0) {
        d[i0] = Math.floor(start / step) * step;
        d[i1] = Math.ceil(stop / step) * step;
        domain(d);
      } else if (step < 0) {
        d[i0] = Math.ceil(start * step) / step;
        d[i1] = Math.floor(stop * step) / step;
        domain(d);
      }

      return scale;
    };

    return scale;
  }

  function linear$1() {
    var scale = continuous();

    scale.copy = function() {
      return copy(scale, linear$1());
    };

    initRange.apply(scale, arguments);

    return linearish(scale);
  }

  var t0$1 = new Date,
      t1$1 = new Date;

  function newInterval(floori, offseti, count, field) {

    function interval(date) {
      return floori(date = arguments.length === 0 ? new Date : new Date(+date)), date;
    }

    interval.floor = function(date) {
      return floori(date = new Date(+date)), date;
    };

    interval.ceil = function(date) {
      return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
    };

    interval.round = function(date) {
      var d0 = interval(date),
          d1 = interval.ceil(date);
      return date - d0 < d1 - date ? d0 : d1;
    };

    interval.offset = function(date, step) {
      return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
    };

    interval.range = function(start, stop, step) {
      var range = [], previous;
      start = interval.ceil(start);
      step = step == null ? 1 : Math.floor(step);
      if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
      do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
      while (previous < start && start < stop);
      return range;
    };

    interval.filter = function(test) {
      return newInterval(function(date) {
        if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
      }, function(date, step) {
        if (date >= date) {
          if (step < 0) while (++step <= 0) {
            while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
          } else while (--step >= 0) {
            while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
          }
        }
      });
    };

    if (count) {
      interval.count = function(start, end) {
        t0$1.setTime(+start), t1$1.setTime(+end);
        floori(t0$1), floori(t1$1);
        return Math.floor(count(t0$1, t1$1));
      };

      interval.every = function(step) {
        step = Math.floor(step);
        return !isFinite(step) || !(step > 0) ? null
            : !(step > 1) ? interval
            : interval.filter(field
                ? function(d) { return field(d) % step === 0; }
                : function(d) { return interval.count(0, d) % step === 0; });
      };
    }

    return interval;
  }

  var millisecond = newInterval(function() {
    // noop
  }, function(date, step) {
    date.setTime(+date + step);
  }, function(start, end) {
    return end - start;
  });

  // An optimized implementation for this simple case.
  millisecond.every = function(k) {
    k = Math.floor(k);
    if (!isFinite(k) || !(k > 0)) return null;
    if (!(k > 1)) return millisecond;
    return newInterval(function(date) {
      date.setTime(Math.floor(date / k) * k);
    }, function(date, step) {
      date.setTime(+date + step * k);
    }, function(start, end) {
      return (end - start) / k;
    });
  };

  var durationSecond = 1e3;
  var durationMinute = 6e4;
  var durationHour = 36e5;
  var durationDay = 864e5;
  var durationWeek = 6048e5;

  var second = newInterval(function(date) {
    date.setTime(date - date.getMilliseconds());
  }, function(date, step) {
    date.setTime(+date + step * durationSecond);
  }, function(start, end) {
    return (end - start) / durationSecond;
  }, function(date) {
    return date.getUTCSeconds();
  });

  var minute = newInterval(function(date) {
    date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond);
  }, function(date, step) {
    date.setTime(+date + step * durationMinute);
  }, function(start, end) {
    return (end - start) / durationMinute;
  }, function(date) {
    return date.getMinutes();
  });

  var hour = newInterval(function(date) {
    date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond - date.getMinutes() * durationMinute);
  }, function(date, step) {
    date.setTime(+date + step * durationHour);
  }, function(start, end) {
    return (end - start) / durationHour;
  }, function(date) {
    return date.getHours();
  });

  var day = newInterval(function(date) {
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setDate(date.getDate() + step);
  }, function(start, end) {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
  }, function(date) {
    return date.getDate() - 1;
  });

  function weekday(i) {
    return newInterval(function(date) {
      date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setDate(date.getDate() + step * 7);
    }, function(start, end) {
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
    });
  }

  var sunday = weekday(0);
  var monday = weekday(1);
  var tuesday = weekday(2);
  var wednesday = weekday(3);
  var thursday = weekday(4);
  var friday = weekday(5);
  var saturday = weekday(6);

  var month = newInterval(function(date) {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setMonth(date.getMonth() + step);
  }, function(start, end) {
    return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
  }, function(date) {
    return date.getMonth();
  });

  var year = newInterval(function(date) {
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setFullYear(date.getFullYear() + step);
  }, function(start, end) {
    return end.getFullYear() - start.getFullYear();
  }, function(date) {
    return date.getFullYear();
  });

  // An optimized implementation for this simple case.
  year.every = function(k) {
    return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
      date.setFullYear(Math.floor(date.getFullYear() / k) * k);
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setFullYear(date.getFullYear() + step * k);
    });
  };

  var utcMinute = newInterval(function(date) {
    date.setUTCSeconds(0, 0);
  }, function(date, step) {
    date.setTime(+date + step * durationMinute);
  }, function(start, end) {
    return (end - start) / durationMinute;
  }, function(date) {
    return date.getUTCMinutes();
  });

  var utcHour = newInterval(function(date) {
    date.setUTCMinutes(0, 0, 0);
  }, function(date, step) {
    date.setTime(+date + step * durationHour);
  }, function(start, end) {
    return (end - start) / durationHour;
  }, function(date) {
    return date.getUTCHours();
  });

  var utcDay = newInterval(function(date) {
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCDate(date.getUTCDate() + step);
  }, function(start, end) {
    return (end - start) / durationDay;
  }, function(date) {
    return date.getUTCDate() - 1;
  });

  function utcWeekday(i) {
    return newInterval(function(date) {
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCDate(date.getUTCDate() + step * 7);
    }, function(start, end) {
      return (end - start) / durationWeek;
    });
  }

  var utcSunday = utcWeekday(0);
  var utcMonday = utcWeekday(1);
  var utcTuesday = utcWeekday(2);
  var utcWednesday = utcWeekday(3);
  var utcThursday = utcWeekday(4);
  var utcFriday = utcWeekday(5);
  var utcSaturday = utcWeekday(6);

  var utcMonth = newInterval(function(date) {
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCMonth(date.getUTCMonth() + step);
  }, function(start, end) {
    return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
  }, function(date) {
    return date.getUTCMonth();
  });

  var utcYear = newInterval(function(date) {
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCFullYear(date.getUTCFullYear() + step);
  }, function(start, end) {
    return end.getUTCFullYear() - start.getUTCFullYear();
  }, function(date) {
    return date.getUTCFullYear();
  });

  // An optimized implementation for this simple case.
  utcYear.every = function(k) {
    return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
      date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCFullYear(date.getUTCFullYear() + step * k);
    });
  };

  function localDate(d) {
    if (0 <= d.y && d.y < 100) {
      var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
      date.setFullYear(d.y);
      return date;
    }
    return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
  }

  function utcDate(d) {
    if (0 <= d.y && d.y < 100) {
      var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
      date.setUTCFullYear(d.y);
      return date;
    }
    return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
  }

  function newDate(y, m, d) {
    return {y: y, m: m, d: d, H: 0, M: 0, S: 0, L: 0};
  }

  function formatLocale$1(locale) {
    var locale_dateTime = locale.dateTime,
        locale_date = locale.date,
        locale_time = locale.time,
        locale_periods = locale.periods,
        locale_weekdays = locale.days,
        locale_shortWeekdays = locale.shortDays,
        locale_months = locale.months,
        locale_shortMonths = locale.shortMonths;

    var periodRe = formatRe(locale_periods),
        periodLookup = formatLookup(locale_periods),
        weekdayRe = formatRe(locale_weekdays),
        weekdayLookup = formatLookup(locale_weekdays),
        shortWeekdayRe = formatRe(locale_shortWeekdays),
        shortWeekdayLookup = formatLookup(locale_shortWeekdays),
        monthRe = formatRe(locale_months),
        monthLookup = formatLookup(locale_months),
        shortMonthRe = formatRe(locale_shortMonths),
        shortMonthLookup = formatLookup(locale_shortMonths);

    var formats = {
      "a": formatShortWeekday,
      "A": formatWeekday,
      "b": formatShortMonth,
      "B": formatMonth,
      "c": null,
      "d": formatDayOfMonth,
      "e": formatDayOfMonth,
      "f": formatMicroseconds,
      "H": formatHour24,
      "I": formatHour12,
      "j": formatDayOfYear,
      "L": formatMilliseconds,
      "m": formatMonthNumber,
      "M": formatMinutes,
      "p": formatPeriod,
      "q": formatQuarter,
      "Q": formatUnixTimestamp,
      "s": formatUnixTimestampSeconds,
      "S": formatSeconds,
      "u": formatWeekdayNumberMonday,
      "U": formatWeekNumberSunday,
      "V": formatWeekNumberISO,
      "w": formatWeekdayNumberSunday,
      "W": formatWeekNumberMonday,
      "x": null,
      "X": null,
      "y": formatYear,
      "Y": formatFullYear,
      "Z": formatZone,
      "%": formatLiteralPercent
    };

    var utcFormats = {
      "a": formatUTCShortWeekday,
      "A": formatUTCWeekday,
      "b": formatUTCShortMonth,
      "B": formatUTCMonth,
      "c": null,
      "d": formatUTCDayOfMonth,
      "e": formatUTCDayOfMonth,
      "f": formatUTCMicroseconds,
      "H": formatUTCHour24,
      "I": formatUTCHour12,
      "j": formatUTCDayOfYear,
      "L": formatUTCMilliseconds,
      "m": formatUTCMonthNumber,
      "M": formatUTCMinutes,
      "p": formatUTCPeriod,
      "q": formatUTCQuarter,
      "Q": formatUnixTimestamp,
      "s": formatUnixTimestampSeconds,
      "S": formatUTCSeconds,
      "u": formatUTCWeekdayNumberMonday,
      "U": formatUTCWeekNumberSunday,
      "V": formatUTCWeekNumberISO,
      "w": formatUTCWeekdayNumberSunday,
      "W": formatUTCWeekNumberMonday,
      "x": null,
      "X": null,
      "y": formatUTCYear,
      "Y": formatUTCFullYear,
      "Z": formatUTCZone,
      "%": formatLiteralPercent
    };

    var parses = {
      "a": parseShortWeekday,
      "A": parseWeekday,
      "b": parseShortMonth,
      "B": parseMonth,
      "c": parseLocaleDateTime,
      "d": parseDayOfMonth,
      "e": parseDayOfMonth,
      "f": parseMicroseconds,
      "H": parseHour24,
      "I": parseHour24,
      "j": parseDayOfYear,
      "L": parseMilliseconds,
      "m": parseMonthNumber,
      "M": parseMinutes,
      "p": parsePeriod,
      "q": parseQuarter,
      "Q": parseUnixTimestamp,
      "s": parseUnixTimestampSeconds,
      "S": parseSeconds,
      "u": parseWeekdayNumberMonday,
      "U": parseWeekNumberSunday,
      "V": parseWeekNumberISO,
      "w": parseWeekdayNumberSunday,
      "W": parseWeekNumberMonday,
      "x": parseLocaleDate,
      "X": parseLocaleTime,
      "y": parseYear,
      "Y": parseFullYear,
      "Z": parseZone,
      "%": parseLiteralPercent
    };

    // These recursive directive definitions must be deferred.
    formats.x = newFormat(locale_date, formats);
    formats.X = newFormat(locale_time, formats);
    formats.c = newFormat(locale_dateTime, formats);
    utcFormats.x = newFormat(locale_date, utcFormats);
    utcFormats.X = newFormat(locale_time, utcFormats);
    utcFormats.c = newFormat(locale_dateTime, utcFormats);

    function newFormat(specifier, formats) {
      return function(date) {
        var string = [],
            i = -1,
            j = 0,
            n = specifier.length,
            c,
            pad,
            format;

        if (!(date instanceof Date)) date = new Date(+date);

        while (++i < n) {
          if (specifier.charCodeAt(i) === 37) {
            string.push(specifier.slice(j, i));
            if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
            else pad = c === "e" ? " " : "0";
            if (format = formats[c]) c = format(date, pad);
            string.push(c);
            j = i + 1;
          }
        }

        string.push(specifier.slice(j, i));
        return string.join("");
      };
    }

    function newParse(specifier, Z) {
      return function(string) {
        var d = newDate(1900, undefined, 1),
            i = parseSpecifier(d, specifier, string += "", 0),
            week, day$1;
        if (i != string.length) return null;

        // If a UNIX timestamp is specified, return it.
        if ("Q" in d) return new Date(d.Q);
        if ("s" in d) return new Date(d.s * 1000 + ("L" in d ? d.L : 0));

        // If this is utcParse, never use the local timezone.
        if (Z && !("Z" in d)) d.Z = 0;

        // The am-pm flag is 0 for AM, and 1 for PM.
        if ("p" in d) d.H = d.H % 12 + d.p * 12;

        // If the month was not specified, inherit from the quarter.
        if (d.m === undefined) d.m = "q" in d ? d.q : 0;

        // Convert day-of-week and week-of-year to day-of-year.
        if ("V" in d) {
          if (d.V < 1 || d.V > 53) return null;
          if (!("w" in d)) d.w = 1;
          if ("Z" in d) {
            week = utcDate(newDate(d.y, 0, 1)), day$1 = week.getUTCDay();
            week = day$1 > 4 || day$1 === 0 ? utcMonday.ceil(week) : utcMonday(week);
            week = utcDay.offset(week, (d.V - 1) * 7);
            d.y = week.getUTCFullYear();
            d.m = week.getUTCMonth();
            d.d = week.getUTCDate() + (d.w + 6) % 7;
          } else {
            week = localDate(newDate(d.y, 0, 1)), day$1 = week.getDay();
            week = day$1 > 4 || day$1 === 0 ? monday.ceil(week) : monday(week);
            week = day.offset(week, (d.V - 1) * 7);
            d.y = week.getFullYear();
            d.m = week.getMonth();
            d.d = week.getDate() + (d.w + 6) % 7;
          }
        } else if ("W" in d || "U" in d) {
          if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
          day$1 = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
          d.m = 0;
          d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$1 + 5) % 7 : d.w + d.U * 7 - (day$1 + 6) % 7;
        }

        // If a time zone is specified, all fields are interpreted as UTC and then
        // offset according to the specified time zone.
        if ("Z" in d) {
          d.H += d.Z / 100 | 0;
          d.M += d.Z % 100;
          return utcDate(d);
        }

        // Otherwise, all fields are in local time.
        return localDate(d);
      };
    }

    function parseSpecifier(d, specifier, string, j) {
      var i = 0,
          n = specifier.length,
          m = string.length,
          c,
          parse;

      while (i < n) {
        if (j >= m) return -1;
        c = specifier.charCodeAt(i++);
        if (c === 37) {
          c = specifier.charAt(i++);
          parse = parses[c in pads ? specifier.charAt(i++) : c];
          if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
        } else if (c != string.charCodeAt(j++)) {
          return -1;
        }
      }

      return j;
    }

    function parsePeriod(d, string, i) {
      var n = periodRe.exec(string.slice(i));
      return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseShortWeekday(d, string, i) {
      var n = shortWeekdayRe.exec(string.slice(i));
      return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseWeekday(d, string, i) {
      var n = weekdayRe.exec(string.slice(i));
      return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseShortMonth(d, string, i) {
      var n = shortMonthRe.exec(string.slice(i));
      return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseMonth(d, string, i) {
      var n = monthRe.exec(string.slice(i));
      return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseLocaleDateTime(d, string, i) {
      return parseSpecifier(d, locale_dateTime, string, i);
    }

    function parseLocaleDate(d, string, i) {
      return parseSpecifier(d, locale_date, string, i);
    }

    function parseLocaleTime(d, string, i) {
      return parseSpecifier(d, locale_time, string, i);
    }

    function formatShortWeekday(d) {
      return locale_shortWeekdays[d.getDay()];
    }

    function formatWeekday(d) {
      return locale_weekdays[d.getDay()];
    }

    function formatShortMonth(d) {
      return locale_shortMonths[d.getMonth()];
    }

    function formatMonth(d) {
      return locale_months[d.getMonth()];
    }

    function formatPeriod(d) {
      return locale_periods[+(d.getHours() >= 12)];
    }

    function formatQuarter(d) {
      return 1 + ~~(d.getMonth() / 3);
    }

    function formatUTCShortWeekday(d) {
      return locale_shortWeekdays[d.getUTCDay()];
    }

    function formatUTCWeekday(d) {
      return locale_weekdays[d.getUTCDay()];
    }

    function formatUTCShortMonth(d) {
      return locale_shortMonths[d.getUTCMonth()];
    }

    function formatUTCMonth(d) {
      return locale_months[d.getUTCMonth()];
    }

    function formatUTCPeriod(d) {
      return locale_periods[+(d.getUTCHours() >= 12)];
    }

    function formatUTCQuarter(d) {
      return 1 + ~~(d.getUTCMonth() / 3);
    }

    return {
      format: function(specifier) {
        var f = newFormat(specifier += "", formats);
        f.toString = function() { return specifier; };
        return f;
      },
      parse: function(specifier) {
        var p = newParse(specifier += "", false);
        p.toString = function() { return specifier; };
        return p;
      },
      utcFormat: function(specifier) {
        var f = newFormat(specifier += "", utcFormats);
        f.toString = function() { return specifier; };
        return f;
      },
      utcParse: function(specifier) {
        var p = newParse(specifier += "", true);
        p.toString = function() { return specifier; };
        return p;
      }
    };
  }

  var pads = {"-": "", "_": " ", "0": "0"},
      numberRe = /^\s*\d+/, // note: ignores next directive
      percentRe = /^%/,
      requoteRe = /[\\^$*+?|[\]().{}]/g;

  function pad(value, fill, width) {
    var sign = value < 0 ? "-" : "",
        string = (sign ? -value : value) + "",
        length = string.length;
    return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
  }

  function requote(s) {
    return s.replace(requoteRe, "\\$&");
  }

  function formatRe(names) {
    return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
  }

  function formatLookup(names) {
    var map = {}, i = -1, n = names.length;
    while (++i < n) map[names[i].toLowerCase()] = i;
    return map;
  }

  function parseWeekdayNumberSunday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.w = +n[0], i + n[0].length) : -1;
  }

  function parseWeekdayNumberMonday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.u = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberSunday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.U = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberISO(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.V = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberMonday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.W = +n[0], i + n[0].length) : -1;
  }

  function parseFullYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 4));
    return n ? (d.y = +n[0], i + n[0].length) : -1;
  }

  function parseYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
  }

  function parseZone(d, string, i) {
    var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
    return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
  }

  function parseQuarter(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
  }

  function parseMonthNumber(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
  }

  function parseDayOfMonth(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.d = +n[0], i + n[0].length) : -1;
  }

  function parseDayOfYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 3));
    return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
  }

  function parseHour24(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.H = +n[0], i + n[0].length) : -1;
  }

  function parseMinutes(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.M = +n[0], i + n[0].length) : -1;
  }

  function parseSeconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.S = +n[0], i + n[0].length) : -1;
  }

  function parseMilliseconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 3));
    return n ? (d.L = +n[0], i + n[0].length) : -1;
  }

  function parseMicroseconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 6));
    return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
  }

  function parseLiteralPercent(d, string, i) {
    var n = percentRe.exec(string.slice(i, i + 1));
    return n ? i + n[0].length : -1;
  }

  function parseUnixTimestamp(d, string, i) {
    var n = numberRe.exec(string.slice(i));
    return n ? (d.Q = +n[0], i + n[0].length) : -1;
  }

  function parseUnixTimestampSeconds(d, string, i) {
    var n = numberRe.exec(string.slice(i));
    return n ? (d.s = +n[0], i + n[0].length) : -1;
  }

  function formatDayOfMonth(d, p) {
    return pad(d.getDate(), p, 2);
  }

  function formatHour24(d, p) {
    return pad(d.getHours(), p, 2);
  }

  function formatHour12(d, p) {
    return pad(d.getHours() % 12 || 12, p, 2);
  }

  function formatDayOfYear(d, p) {
    return pad(1 + day.count(year(d), d), p, 3);
  }

  function formatMilliseconds(d, p) {
    return pad(d.getMilliseconds(), p, 3);
  }

  function formatMicroseconds(d, p) {
    return formatMilliseconds(d, p) + "000";
  }

  function formatMonthNumber(d, p) {
    return pad(d.getMonth() + 1, p, 2);
  }

  function formatMinutes(d, p) {
    return pad(d.getMinutes(), p, 2);
  }

  function formatSeconds(d, p) {
    return pad(d.getSeconds(), p, 2);
  }

  function formatWeekdayNumberMonday(d) {
    var day = d.getDay();
    return day === 0 ? 7 : day;
  }

  function formatWeekNumberSunday(d, p) {
    return pad(sunday.count(year(d) - 1, d), p, 2);
  }

  function formatWeekNumberISO(d, p) {
    var day = d.getDay();
    d = (day >= 4 || day === 0) ? thursday(d) : thursday.ceil(d);
    return pad(thursday.count(year(d), d) + (year(d).getDay() === 4), p, 2);
  }

  function formatWeekdayNumberSunday(d) {
    return d.getDay();
  }

  function formatWeekNumberMonday(d, p) {
    return pad(monday.count(year(d) - 1, d), p, 2);
  }

  function formatYear(d, p) {
    return pad(d.getFullYear() % 100, p, 2);
  }

  function formatFullYear(d, p) {
    return pad(d.getFullYear() % 10000, p, 4);
  }

  function formatZone(d) {
    var z = d.getTimezoneOffset();
    return (z > 0 ? "-" : (z *= -1, "+"))
        + pad(z / 60 | 0, "0", 2)
        + pad(z % 60, "0", 2);
  }

  function formatUTCDayOfMonth(d, p) {
    return pad(d.getUTCDate(), p, 2);
  }

  function formatUTCHour24(d, p) {
    return pad(d.getUTCHours(), p, 2);
  }

  function formatUTCHour12(d, p) {
    return pad(d.getUTCHours() % 12 || 12, p, 2);
  }

  function formatUTCDayOfYear(d, p) {
    return pad(1 + utcDay.count(utcYear(d), d), p, 3);
  }

  function formatUTCMilliseconds(d, p) {
    return pad(d.getUTCMilliseconds(), p, 3);
  }

  function formatUTCMicroseconds(d, p) {
    return formatUTCMilliseconds(d, p) + "000";
  }

  function formatUTCMonthNumber(d, p) {
    return pad(d.getUTCMonth() + 1, p, 2);
  }

  function formatUTCMinutes(d, p) {
    return pad(d.getUTCMinutes(), p, 2);
  }

  function formatUTCSeconds(d, p) {
    return pad(d.getUTCSeconds(), p, 2);
  }

  function formatUTCWeekdayNumberMonday(d) {
    var dow = d.getUTCDay();
    return dow === 0 ? 7 : dow;
  }

  function formatUTCWeekNumberSunday(d, p) {
    return pad(utcSunday.count(utcYear(d) - 1, d), p, 2);
  }

  function formatUTCWeekNumberISO(d, p) {
    var day = d.getUTCDay();
    d = (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
    return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
  }

  function formatUTCWeekdayNumberSunday(d) {
    return d.getUTCDay();
  }

  function formatUTCWeekNumberMonday(d, p) {
    return pad(utcMonday.count(utcYear(d) - 1, d), p, 2);
  }

  function formatUTCYear(d, p) {
    return pad(d.getUTCFullYear() % 100, p, 2);
  }

  function formatUTCFullYear(d, p) {
    return pad(d.getUTCFullYear() % 10000, p, 4);
  }

  function formatUTCZone() {
    return "+0000";
  }

  function formatLiteralPercent() {
    return "%";
  }

  function formatUnixTimestamp(d) {
    return +d;
  }

  function formatUnixTimestampSeconds(d) {
    return Math.floor(+d / 1000);
  }

  var locale$1;
  var timeFormat;
  var timeParse;
  var utcFormat;
  var utcParse;

  defaultLocale$1({
    dateTime: "%x, %X",
    date: "%-m/%-d/%Y",
    time: "%-I:%M:%S %p",
    periods: ["AM", "PM"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  });

  function defaultLocale$1(definition) {
    locale$1 = formatLocale$1(definition);
    timeFormat = locale$1.format;
    timeParse = locale$1.parse;
    utcFormat = locale$1.utcFormat;
    utcParse = locale$1.utcParse;
    return locale$1;
  }

  var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

  function formatIsoNative(date) {
    return date.toISOString();
  }

  var formatIso = Date.prototype.toISOString
      ? formatIsoNative
      : utcFormat(isoSpecifier);

  function parseIsoNative(string) {
    var date = new Date(string);
    return isNaN(date) ? null : date;
  }

  var parseIso = +new Date("2000-01-01T00:00:00.000Z")
      ? parseIsoNative
      : utcParse(isoSpecifier);

  var noop = {value: function() {}};

  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }

  function Dispatch(_) {
    this._ = _;
  }

  function parseTypenames(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return {type: t, name: name};
    });
  }

  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _ = this._,
          T = parseTypenames(typename + "", _),
          t,
          i = -1,
          n = T.length;

      // If no callback was specified, return the callback of the given type and name.
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        return;
      }

      // If a type was specified, set the callback for the given type and name.
      // Otherwise, if a null callback was specified, remove callbacks of the given name.
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
      }

      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };

  function get(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }

  function set(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({name: name, value: callback});
    return type;
  }

  var xhtml = "http://www.w3.org/1999/xhtml";

  var namespaces = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function namespace(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
  }

  function creatorInherit(name) {
    return function() {
      var document = this.ownerDocument,
          uri = this.namespaceURI;
      return uri === xhtml && document.documentElement.namespaceURI === xhtml
          ? document.createElement(name)
          : document.createElementNS(uri, name);
    };
  }

  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }

  function creator(name) {
    var fullname = namespace(name);
    return (fullname.local
        ? creatorFixed
        : creatorInherit)(fullname);
  }

  function none() {}

  function selector(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  function selection_select(select) {
    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function empty() {
    return [];
  }

  function selectorAll(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  function selection_selectAll(select) {
    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }

    return new Selection(subgroups, parents);
  }

  function matcher(selector) {
    return function() {
      return this.matches(selector);
    };
  }

  function selection_filter(match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function sparse(update) {
    return new Array(update.length);
  }

  function selection_enter() {
    return new Selection(this._enter || this._groups.map(sparse), this._parents);
  }

  function EnterNode(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }

  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
    insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
    querySelector: function(selector) { return this._parent.querySelector(selector); },
    querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
  };

  function constant$2(x) {
    return function() {
      return x;
    };
  }

  var keyPrefix = "$"; // Protect against keys like “__proto__”.

  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0,
        node,
        groupLength = group.length,
        dataLength = data.length;

    // Put any non-null nodes that fit into update.
    // Put any null nodes into enter.
    // Put any remaining data into enter.
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Put any non-null nodes that don’t fit into exit.
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }

  function bindKey(parent, group, enter, update, exit, data, key) {
    var i,
        node,
        nodeByKeyValue = {},
        groupLength = group.length,
        dataLength = data.length,
        keyValues = new Array(groupLength),
        keyValue;

    // Compute the key for each node.
    // If multiple nodes have the same key, the duplicates are added to exit.
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
        if (keyValue in nodeByKeyValue) {
          exit[i] = node;
        } else {
          nodeByKeyValue[keyValue] = node;
        }
      }
    }

    // Compute the key for each datum.
    // If there a node associated with this key, join and add it to update.
    // If there is not (or the key is a duplicate), add it to enter.
    for (i = 0; i < dataLength; ++i) {
      keyValue = keyPrefix + key.call(parent, data[i], i, data);
      if (node = nodeByKeyValue[keyValue]) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue[keyValue] = null;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Add any remaining nodes that were not bound to data to exit.
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
        exit[i] = node;
      }
    }
  }

  function selection_data(value, key) {
    if (!value) {
      data = new Array(this.size()), j = -1;
      this.each(function(d) { data[++j] = d; });
      return data;
    }

    var bind = key ? bindKey : bindIndex,
        parents = this._parents,
        groups = this._groups;

    if (typeof value !== "function") value = constant$2(value);

    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j],
          group = groups[j],
          groupLength = group.length,
          data = value.call(parent, parent && parent.__data__, j, parents),
          dataLength = data.length,
          enterGroup = enter[j] = new Array(dataLength),
          updateGroup = update[j] = new Array(dataLength),
          exitGroup = exit[j] = new Array(groupLength);

      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

      // Now connect the enter nodes to their following update node, such that
      // appendChild can insert the materialized enter node before this node,
      // rather than at the end of the parent node.
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength);
          previous._next = next || null;
        }
      }
    }

    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }

  function selection_exit() {
    return new Selection(this._exit || this._groups.map(sparse), this._parents);
  }

  function selection_join(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
    if (onupdate != null) update = onupdate(update);
    if (onexit == null) exit.remove(); else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  function selection_merge(selection) {

    for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Selection(merges, this._parents);
  }

  function selection_order() {

    for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }

    return this;
  }

  function selection_sort(compare) {
    if (!compare) compare = ascending$1;

    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }

    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }

    return new Selection(sortgroups, this._parents).order();
  }

  function ascending$1(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function selection_call() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  function selection_nodes() {
    var nodes = new Array(this.size()), i = -1;
    this.each(function() { nodes[++i] = this; });
    return nodes;
  }

  function selection_node() {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }

    return null;
  }

  function selection_size() {
    var size = 0;
    this.each(function() { ++size; });
    return size;
  }

  function selection_empty() {
    return !this.node();
  }

  function selection_each(callback) {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }

    return this;
  }

  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }

  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }

  function attrFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }

  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }

  function selection_attr(name, value) {
    var fullname = namespace(name);

    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local
          ? node.getAttributeNS(fullname.space, fullname.local)
          : node.getAttribute(fullname);
    }

    return this.each((value == null
        ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
        ? (fullname.local ? attrFunctionNS : attrFunction)
        : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
  }

  function defaultView(node) {
    return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
        || (node.document && node) // node is a Window
        || node.defaultView; // node is a Document
  }

  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }

  function styleFunction(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }

  function selection_style(name, value, priority) {
    return arguments.length > 1
        ? this.each((value == null
              ? styleRemove : typeof value === "function"
              ? styleFunction
              : styleConstant)(name, value, priority == null ? "" : priority))
        : styleValue(this.node(), name);
  }

  function styleValue(node, name) {
    return node.style.getPropertyValue(name)
        || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }

  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }

  function propertyFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }

  function selection_property(name, value) {
    return arguments.length > 1
        ? this.each((value == null
            ? propertyRemove : typeof value === "function"
            ? propertyFunction
            : propertyConstant)(name, value))
        : this.node()[name];
  }

  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }

  function classList(node) {
    return node.classList || new ClassList(node);
  }

  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }

  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };

  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }

  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }

  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }

  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }

  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }

  function selection_classed(name, value) {
    var names = classArray(name + "");

    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }

    return this.each((typeof value === "function"
        ? classedFunction : value
        ? classedTrue
        : classedFalse)(names, value));
  }

  function textRemove() {
    this.textContent = "";
  }

  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }

  function selection_text(value) {
    return arguments.length
        ? this.each(value == null
            ? textRemove : (typeof value === "function"
            ? textFunction
            : textConstant)(value))
        : this.node().textContent;
  }

  function htmlRemove() {
    this.innerHTML = "";
  }

  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }

  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }

  function selection_html(value) {
    return arguments.length
        ? this.each(value == null
            ? htmlRemove : (typeof value === "function"
            ? htmlFunction
            : htmlConstant)(value))
        : this.node().innerHTML;
  }

  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }

  function selection_raise() {
    return this.each(raise);
  }

  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }

  function selection_lower() {
    return this.each(lower);
  }

  function selection_append(name) {
    var create = typeof name === "function" ? name : creator(name);
    return this.select(function() {
      return this.appendChild(create.apply(this, arguments));
    });
  }

  function constantNull() {
    return null;
  }

  function selection_insert(name, before) {
    var create = typeof name === "function" ? name : creator(name),
        select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
    return this.select(function() {
      return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }

  function selection_remove() {
    return this.each(remove);
  }

  function selection_cloneShallow() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_cloneDeep() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_clone(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  function selection_datum(value) {
    return arguments.length
        ? this.property("__data__", value)
        : this.node().__data__;
  }

  var filterEvents = {};

  var event = null;

  if (typeof document !== "undefined") {
    var element = document.documentElement;
    if (!("onmouseenter" in element)) {
      filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
    }
  }

  function filterContextListener(listener, index, group) {
    listener = contextListener(listener, index, group);
    return function(event) {
      var related = event.relatedTarget;
      if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
        listener.call(this, event);
      }
    };
  }

  function contextListener(listener, index, group) {
    return function(event1) {
      var event0 = event; // Events can be reentrant (e.g., focus).
      event = event1;
      try {
        listener.call(this, this.__data__, index, group);
      } finally {
        event = event0;
      }
    };
  }

  function parseTypenames$1(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return {type: t, name: name};
    });
  }

  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }

  function onAdd(typename, value, capture) {
    var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
    return function(d, i, group) {
      var on = this.__on, o, listener = wrap(value, i, group);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
          this.addEventListener(o.type, o.listener = listener, o.capture = capture);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, capture);
      o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }

  function selection_on(typename, value, capture) {
    var typenames = parseTypenames$1(typename + ""), i, n = typenames.length, t;

    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }

    on = value ? onAdd : onRemove;
    if (capture == null) capture = false;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
    return this;
  }

  function customEvent(event1, listener, that, args) {
    var event0 = event;
    event1.sourceEvent = event;
    event = event1;
    try {
      return listener.apply(that, args);
    } finally {
      event = event0;
    }
  }

  function dispatchEvent(node, type, params) {
    var window = defaultView(node),
        event = window.CustomEvent;

    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }

    node.dispatchEvent(event);
  }

  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }

  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }

  function selection_dispatch(type, params) {
    return this.each((typeof params === "function"
        ? dispatchFunction
        : dispatchConstant)(type, params));
  }

  var root = [null];

  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }

  function selection() {
    return new Selection([[document.documentElement]], root);
  }

  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: selection_select,
    selectAll: selection_selectAll,
    filter: selection_filter,
    data: selection_data,
    enter: selection_enter,
    exit: selection_exit,
    join: selection_join,
    merge: selection_merge,
    order: selection_order,
    sort: selection_sort,
    call: selection_call,
    nodes: selection_nodes,
    node: selection_node,
    size: selection_size,
    empty: selection_empty,
    each: selection_each,
    attr: selection_attr,
    style: selection_style,
    property: selection_property,
    classed: selection_classed,
    text: selection_text,
    html: selection_html,
    raise: selection_raise,
    lower: selection_lower,
    append: selection_append,
    insert: selection_insert,
    remove: selection_remove,
    clone: selection_clone,
    datum: selection_datum,
    on: selection_on,
    dispatch: selection_dispatch
  };

  function select(selector) {
    return typeof selector === "string"
        ? new Selection([[document.querySelector(selector)]], [document.documentElement])
        : new Selection([[selector]], root);
  }

  function sourceEvent() {
    var current = event, source;
    while (source = current.sourceEvent) current = source;
    return current;
  }

  function point(node, event) {
    var svg = node.ownerSVGElement || node;

    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }

    var rect = node.getBoundingClientRect();
    return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
  }

  function mouse(node) {
    var event = sourceEvent();
    if (event.changedTouches) event = event.changedTouches[0];
    return point(node, event);
  }

  function touch(node, touches, identifier) {
    if (arguments.length < 3) identifier = touches, touches = sourceEvent().changedTouches;

    for (var i = 0, n = touches ? touches.length : 0, touch; i < n; ++i) {
      if ((touch = touches[i]).identifier === identifier) {
        return point(node, touch);
      }
    }

    return null;
  }

  function nopropagation() {
    event.stopImmediatePropagation();
  }

  function noevent() {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function nodrag(view) {
    var root = view.document.documentElement,
        selection = select(view).on("dragstart.drag", noevent, true);
    if ("onselectstart" in root) {
      selection.on("selectstart.drag", noevent, true);
    } else {
      root.__noselect = root.style.MozUserSelect;
      root.style.MozUserSelect = "none";
    }
  }

  function yesdrag(view, noclick) {
    var root = view.document.documentElement,
        selection = select(view).on("dragstart.drag", null);
    if (noclick) {
      selection.on("click.drag", noevent, true);
      setTimeout(function() { selection.on("click.drag", null); }, 0);
    }
    if ("onselectstart" in root) {
      selection.on("selectstart.drag", null);
    } else {
      root.style.MozUserSelect = root.__noselect;
      delete root.__noselect;
    }
  }

  function constant$3(x) {
    return function() {
      return x;
    };
  }

  function DragEvent(target, type, subject, id, active, x, y, dx, dy, dispatch) {
    this.target = target;
    this.type = type;
    this.subject = subject;
    this.identifier = id;
    this.active = active;
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this._ = dispatch;
  }

  DragEvent.prototype.on = function() {
    var value = this._.on.apply(this._, arguments);
    return value === this._ ? this : value;
  };

  // Ignore right-click, since that should open the context menu.
  function defaultFilter() {
    return !event.ctrlKey && !event.button;
  }

  function defaultContainer() {
    return this.parentNode;
  }

  function defaultSubject(d) {
    return d == null ? {x: event.x, y: event.y} : d;
  }

  function defaultTouchable() {
    return navigator.maxTouchPoints || ("ontouchstart" in this);
  }

  function drag() {
    var filter = defaultFilter,
        container = defaultContainer,
        subject = defaultSubject,
        touchable = defaultTouchable,
        gestures = {},
        listeners = dispatch("start", "drag", "end"),
        active = 0,
        mousedownx,
        mousedowny,
        mousemoving,
        touchending,
        clickDistance2 = 0;

    function drag(selection) {
      selection
          .on("mousedown.drag", mousedowned)
        .filter(touchable)
          .on("touchstart.drag", touchstarted)
          .on("touchmove.drag", touchmoved)
          .on("touchend.drag touchcancel.drag", touchended)
          .style("touch-action", "none")
          .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }

    function mousedowned() {
      if (touchending || !filter.apply(this, arguments)) return;
      var gesture = beforestart("mouse", container.apply(this, arguments), mouse, this, arguments);
      if (!gesture) return;
      select(event.view).on("mousemove.drag", mousemoved, true).on("mouseup.drag", mouseupped, true);
      nodrag(event.view);
      nopropagation();
      mousemoving = false;
      mousedownx = event.clientX;
      mousedowny = event.clientY;
      gesture("start");
    }

    function mousemoved() {
      noevent();
      if (!mousemoving) {
        var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
        mousemoving = dx * dx + dy * dy > clickDistance2;
      }
      gestures.mouse("drag");
    }

    function mouseupped() {
      select(event.view).on("mousemove.drag mouseup.drag", null);
      yesdrag(event.view, mousemoving);
      noevent();
      gestures.mouse("end");
    }

    function touchstarted() {
      if (!filter.apply(this, arguments)) return;
      var touches = event.changedTouches,
          c = container.apply(this, arguments),
          n = touches.length, i, gesture;

      for (i = 0; i < n; ++i) {
        if (gesture = beforestart(touches[i].identifier, c, touch, this, arguments)) {
          nopropagation();
          gesture("start");
        }
      }
    }

    function touchmoved() {
      var touches = event.changedTouches,
          n = touches.length, i, gesture;

      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          noevent();
          gesture("drag");
        }
      }
    }

    function touchended() {
      var touches = event.changedTouches,
          n = touches.length, i, gesture;

      if (touchending) clearTimeout(touchending);
      touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          nopropagation();
          gesture("end");
        }
      }
    }

    function beforestart(id, container, point, that, args) {
      var p = point(container, id), s, dx, dy,
          sublisteners = listeners.copy();

      if (!customEvent(new DragEvent(drag, "beforestart", s, id, active, p[0], p[1], 0, 0, sublisteners), function() {
        if ((event.subject = s = subject.apply(that, args)) == null) return false;
        dx = s.x - p[0] || 0;
        dy = s.y - p[1] || 0;
        return true;
      })) return;

      return function gesture(type) {
        var p0 = p, n;
        switch (type) {
          case "start": gestures[id] = gesture, n = active++; break;
          case "end": delete gestures[id], --active; // nobreak
          case "drag": p = point(container, id), n = active; break;
        }
        customEvent(new DragEvent(drag, type, s, id, n, p[0] + dx, p[1] + dy, p[0] - p0[0], p[1] - p0[1], sublisteners), sublisteners.apply, sublisteners, [type, that, args]);
      };
    }

    drag.filter = function(_) {
      return arguments.length ? (filter = typeof _ === "function" ? _ : constant$3(!!_), drag) : filter;
    };

    drag.container = function(_) {
      return arguments.length ? (container = typeof _ === "function" ? _ : constant$3(_), drag) : container;
    };

    drag.subject = function(_) {
      return arguments.length ? (subject = typeof _ === "function" ? _ : constant$3(_), drag) : subject;
    };

    drag.touchable = function(_) {
      return arguments.length ? (touchable = typeof _ === "function" ? _ : constant$3(!!_), drag) : touchable;
    };

    drag.on = function() {
      var value = listeners.on.apply(listeners, arguments);
      return value === listeners ? drag : value;
    };

    drag.clickDistance = function(_) {
      return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
    };

    return drag;
  }

  // Copyright 2018 The Distill Template Authors

  const T$b = Template('d-slider', `
<style>
  :host {
    position: relative;
    display: inline-block;
  }

  :host(:focus) {
    outline: none;
  }

  .background {
    padding: 9px 0;
    color: white;
    position: relative;
  }

  .track {
    height: 3px;
    width: 100%;
    border-radius: 2px;
    background-color: hsla(0, 0%, 0%, 0.2);
  }

  .track-fill {
    position: absolute;
    top: 9px;
    height: 3px;
    border-radius: 4px;
    background-color: hsl(24, 100%, 50%);
  }

  .knob-container {
    position: absolute;
    top: 10px;
  }

  .knob {
    position: absolute;
    top: -6px;
    left: -6px;
    width: 13px;
    height: 13px;
    background-color: hsl(24, 100%, 50%);
    border-radius: 50%;
    transition-property: transform;
    transition-duration: 0.18s;
    transition-timing-function: ease;
  }
  .mousedown .knob {
    transform: scale(1.5);
  }

  .knob-highlight {
    position: absolute;
    top: -6px;
    left: -6px;
    width: 13px;
    height: 13px;
    background-color: hsla(0, 0%, 0%, 0.1);
    border-radius: 50%;
    transition-property: transform;
    transition-duration: 0.18s;
    transition-timing-function: ease;
  }

  .focus .knob-highlight {
    transform: scale(2);
  }

  .ticks {
    position: absolute;
    top: 16px;
    height: 4px;
    width: 100%;
    z-index: -1;
  }

  .ticks .tick {
    position: absolute;
    height: 100%;
    border-left: 1px solid hsla(0, 0%, 0%, 0.2);
  }

</style>

  <div class='background'>
    <div class='track'></div>
    <div class='track-fill'></div>
    <div class='knob-container'>
      <div class='knob-highlight'></div>
      <div class='knob'></div>
    </div>
    <div class='ticks'></div>
  </div>
`);

  // ARIA
  // If the slider has a visible label, it is referenced by aria-labelledby on the slider element. Otherwise, the slider element has a label provided by aria-label.
  // If the slider is vertically oriented, it has aria-orientation set to vertical. The default value of aria-orientation for a slider is horizontal.

  const keyCodes = {
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    pageUp: 33,
    pageDown: 34,
    end: 35,
    home: 36
  };

  class Slider extends T$b(HTMLElement) {


    connectedCallback() {
      this.connected = true;
      this.setAttribute('role', 'slider');
      // Makes the element tab-able.
      if (!this.hasAttribute('tabindex')) { this.setAttribute('tabindex', 0); }

      // Keeps track of keyboard vs. mouse interactions for focus rings
      this.mouseEvent = false;

      // Handles to shadow DOM elements
      this.knob = this.root.querySelector('.knob-container');
      this.background = this.root.querySelector('.background');
      this.trackFill = this.root.querySelector('.track-fill');
      this.track = this.root.querySelector('.track');

      // Default values for attributes
      this.min = this.min ? this.min : 0;
      this.max = this.max ? this.max : 100;
      this.scale = linear$1().domain([this.min, this.max]).range([0, 1]).clamp(true);

      this.origin = this.origin !== undefined ? this.origin : this.min;
      this.step = this.step ? this.step : 1;
      this.update(this.value ? this.value : 0);

      this.ticks = this.ticks ? this.ticks : false;
      this.renderTicks();

      this.drag = drag()
        .container(this.background)
        .on('start', () => {
          this.mouseEvent = true;
          this.background.classList.add('mousedown');
          this.changeValue = this.value;
          this.dragUpdate();
        })
        .on('drag', () => {
          this.dragUpdate();
        })
        .on('end', () => {
          this.mouseEvent = false;
          this.background.classList.remove('mousedown');
          this.dragUpdate();
          if (this.changeValue !== this.value) this.dispatchChange();
          this.changeValue = this.value;
        });
      this.drag(select(this.background));

      this.addEventListener('focusin', () => {
        if(!this.mouseEvent) {
          this.background.classList.add('focus');
        }
      });
      this.addEventListener('focusout', () => {
        this.background.classList.remove('focus');
      });
      this.addEventListener('keydown', this.onKeyDown);

    }

    static get observedAttributes() {return ['min', 'max', 'value', 'step', 'ticks', 'origin', 'tickValues', 'tickLabels']; }

    attributeChangedCallback(attr, oldValue, newValue) {
      if (isNaN(newValue) || newValue === undefined || newValue === null) return;
      if (attr == 'min') {
        this.min = +newValue;
        this.setAttribute('aria-valuemin', this.min);
      }
      if (attr == 'max') {
        this.max = +newValue;
        this.setAttribute('aria-valuemax', this.max);
      }
      if (attr == 'value') {
        this.update(+newValue);
      }
      if (attr == 'origin') {
        this.origin = +newValue;
        // this.update(this.value);
      }
      if (attr == 'step') {
        if (newValue > 0) {
          this.step = +newValue;
        }
      }
      if (attr == 'ticks') {
        this.ticks = (newValue === '' ? true : newValue);
      }
    }

    onKeyDown(event) {
      this.changeValue = this.value;
      let stopPropagation = false;
      switch (event.keyCode) {
      case keyCodes.left:
      case keyCodes.down:
        this.update(this.value - this.step);
        stopPropagation = true;
        break;
      case keyCodes.right:
      case keyCodes.up:
        this.update(this.value + this.step);
        stopPropagation = true;
        break;
      case keyCodes.pageUp:
        this.update(this.value + this.step * 10);
        stopPropagation = true;
        break;

      case keyCodes.pageDown:
        this.update(this.value + this.step * 10);
        stopPropagation = true;
        break;
      case keyCodes.home:
        this.update(this.min);
        stopPropagation = true;
        break;
      case keyCodes.end:
        this.update(this.max);
        stopPropagation = true;
        break;
      }
      if (stopPropagation) {
        this.background.classList.add('focus');
        event.preventDefault();
        event.stopPropagation();
        if (this.changeValue !== this.value) this.dispatchChange();
      }
    }

    validateValueRange(min, max, value) {
      return Math.max(Math.min(max, value), min);
    }

    quantizeValue(value, step) {
      return Math.round(value / step) * step;
    }

    dragUpdate() {
      const bbox = this.background.getBoundingClientRect();
      const x = event.x;
      const width = bbox.width;
      this.update(this.scale.invert(x / width));
    }

    update(value) {
      let v = value;
      if (this.step !== 'any') {
        v = this.quantizeValue(value, this.step);
      }
      v = this.validateValueRange(this.min, this.max, v);
      if (this.connected) {
        this.knob.style.left = this.scale(v) * 100 + '%';
        this.trackFill.style.width = this.scale(this.min + Math.abs(v - this.origin)) * 100 + '%';
        this.trackFill.style.left = this.scale(Math.min(v, this.origin)) * 100 + '%';
      }
      if (this.value !== v) {
        this.value = v;
        this.setAttribute('aria-valuenow', this.value);
        this.dispatchInput();
      }
    }

    // Dispatches only on a committed change (basically only on mouseup).
    dispatchChange() {
      const e = new Event('change');
      this.dispatchEvent(e, {});
    }

    // Dispatches on each value change.
    dispatchInput() {
      const e = new Event('input');
      this.dispatchEvent(e, {});
    }

    renderTicks() {
      const ticksContainer = this.root.querySelector('.ticks');
      if (this.ticks !== false) {
        let tickData = [];
        if (this.ticks > 0) {
          tickData = this.scale.ticks(this.ticks);
        } else if (this.step === 'any') {
          tickData = this.scale.ticks();
        } else {
          tickData = range(this.min, this.max + 1e-6, this.step);
        }
        tickData.forEach(d => {
          const tick = document.createElement('div');
          tick.classList.add('tick');
          tick.style.left = this.scale(d) * 100 + '%';
          ticksContainer.appendChild(tick);
        });
      } else {
        ticksContainer.style.display = 'none';
      }
    }
  }

  var logo = "<svg viewBox=\"-607 419 64 64\">\n  <path d=\"M-573.4,478.9c-8,0-14.6-6.4-14.6-14.5s14.6-25.9,14.6-40.8c0,14.9,14.6,32.8,14.6,40.8S-565.4,478.9-573.4,478.9z\"/>\n</svg>\n";

  const headerTemplate = `
<style>
distill-header {
  position: relative;
  height: 60px;
  background-color: hsl(200, 60%, 15%);
  width: 100%;
  box-sizing: border-box;
  z-index: 2;
  color: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}
distill-header .content {
  height: 70px;
  grid-column: page;
}
distill-header a {
  font-size: 16px;
  height: 60px;
  line-height: 60px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.8);
  padding: 22px 0;
}
distill-header a:hover {
  color: rgba(255, 255, 255, 1);
}
distill-header svg {
  width: 24px;
  position: relative;
  top: 4px;
  margin-right: 2px;
}
@media(min-width: 1080px) {
  distill-header {
    height: 70px;
  }
  distill-header a {
    height: 70px;
    line-height: 70px;
    padding: 28px 0;
  }
  distill-header .logo {
  }
}
distill-header svg path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.8);
  stroke-width: 3px;
}
distill-header .logo {
  font-size: 17px;
  font-weight: 200;
}
distill-header .nav {
  float: right;
  font-weight: 300;
}
distill-header .nav a {
  font-size: 12px;
  margin-left: 24px;
  text-transform: uppercase;
}
</style>
<div class="content">
  <a href="/" class="logo">
    ${logo}
    Distill
  </a>
  <nav class="nav">
    <a href="/about/">About</a>
    <a href="/prize/">Prize</a>
    <a href="/journal/">Submit</a>
  </nav>
</div>
`;

  // Copyright 2018 The Distill Template Authors

  const T$c = Template('distill-header', headerTemplate, false);

  class DistillHeader extends T$c(HTMLElement) {

  }

  // Copyright 2018 The Distill Template Authors

  const styles$2 = `
<style>
  distill-appendix {
    contain: layout style;
  }

  distill-appendix .citation {
    font-size: 11px;
    line-height: 15px;
    border-left: 1px solid rgba(0, 0, 0, 0.1);
    padding-left: 18px;
    border: 1px solid rgba(0,0,0,0.1);
    background: rgba(0, 0, 0, 0.02);
    padding: 10px 18px;
    border-radius: 3px;
    color: rgba(150, 150, 150, 1);
    overflow: hidden;
    margin-top: -12px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  distill-appendix > * {
    grid-column: text;
  }
</style>
`;

  function appendixTemplate(frontMatter) {
    let html = styles$2;

    if (typeof frontMatter.githubUrl !== 'undefined') {
      html += `
    <h3 id="updates-and-corrections">Updates and Corrections</h3>
    <p>`;
      if (frontMatter.githubCompareUpdatesUrl) {
        html += `<a href="${frontMatter.githubCompareUpdatesUrl}">View all changes</a> to this article since it was first published.`;
      }
      html += `
    If you see mistakes or want to suggest changes, please <a href="${frontMatter.githubUrl + '/issues/new'}">create an issue on GitHub</a>. </p>
    `;
    }

    const journal = frontMatter.journal;
    if (typeof journal !== 'undefined' && journal.title === 'Distill') {
      html += `
    <h3 id="reuse">Reuse</h3>
    <p>Diagrams and text are licensed under Creative Commons Attribution <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a> with the <a class="github" href="${frontMatter.githubUrl}">source available on GitHub</a>, unless noted otherwise. The figures that have been reused from other sources don’t fall under this license and can be recognized by a note in their caption: “Figure from …”.</p>
    `;
    }

    if (typeof frontMatter.publishedDate !== 'undefined') {
      html += `
    <h3 id="citation">Citation</h3>
    <p>For attribution in academic contexts, please cite this work as</p>
    <pre class="citation short">${frontMatter.concatenatedAuthors}, "${frontMatter.title}", Distill, ${frontMatter.publishedYear}.</pre>
    <p>BibTeX citation</p>
    <pre class="citation long">${serializeFrontmatterToBibtex(frontMatter)}</pre>
    `;
    }

    return html;
  }

  class DistillAppendix extends HTMLElement {

    static get is() { return 'distill-appendix'; }

    set frontMatter(frontMatter) {
      this.innerHTML = appendixTemplate(frontMatter);
    }

  }

  const footerTemplate = `
<style>

:host {
  color: rgba(255, 255, 255, 0.5);
  font-weight: 300;
  padding: 2rem 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background-color: hsl(180, 5%, 15%); /*hsl(200, 60%, 15%);*/
  text-align: left;
  contain: content;
}

.footer-container .logo svg {
  width: 24px;
  position: relative;
  top: 4px;
  margin-right: 2px;
}

.footer-container .logo svg path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.8);
  stroke-width: 3px;
}

.footer-container .logo {
  font-size: 17px;
  font-weight: 200;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  margin-right: 6px;
}

.footer-container {
  grid-column: text;
}

.footer-container .nav {
  font-size: 0.9em;
  margin-top: 1.5em;
}

.footer-container .nav a {
  color: rgba(255, 255, 255, 0.8);
  margin-right: 6px;
  text-decoration: none;
}

</style>

<div class='footer-container'>

  <a href="/" class="logo">
    ${logo}
    Distill
  </a> is dedicated to clear explanations of machine learning

  <div class="nav">
    <a href="https://distill.pub/about/">About</a>
    <a href="https://distill.pub/journal/">Submit</a>
    <a href="https://distill.pub/prize/">Prize</a>
    <a href="https://distill.pub/archive/">Archive</a>
    <a href="https://distill.pub/rss.xml">RSS</a>
    <a href="https://github.com/distillpub">GitHub</a>
    <a href="https://twitter.com/distillpub">Twitter</a>
    &nbsp;&nbsp;&nbsp;&nbsp; ISSN 2476-0757
  </div>

</div>

`;

  // Copyright 2018 The Distill Template Authors

  const T$d = Template('distill-footer', footerTemplate);

  class DistillFooter extends T$d(HTMLElement) {

  }

  // Copyright 2018 The Distill Template Authors

  let templateIsLoading = false;
  let runlevel = 0;
  const initialize = function() {
    if (window.distill.runlevel < 1) {
      throw new Error("Insufficient Runlevel for Distill Template!");
    }

    /* 1. Flag that we're being loaded */
    if ("distill" in window && window.distill.templateIsLoading) {
      throw new Error(
        "Runlevel 1: Distill Template is getting loaded more than once, aborting!"
      );
    } else {
      window.distill.templateIsLoading = true;
      console.debug("Runlevel 1: Distill Template has started loading.");
    }

    /* 2. Add styles if they weren't added during prerendering */
    makeStyleTag(document);
    console.debug("Runlevel 1: Static Distill styles have been added.");
    console.debug("Runlevel 1->2.");
    window.distill.runlevel += 1;

    /* 3. Register Controller listener functions */
    /* Needs to happen before components to their connected callbacks have a controller to talk to. */
    for (const [functionName, callback] of Object.entries(Controller.listeners)) {
      if (typeof callback === "function") {
        document.addEventListener(functionName, callback);
      } else {
        console.error("Runlevel 2: Controller listeners need to be functions!");
      }
    }
    console.debug("Runlevel 2: We can now listen to controller events.");
    console.debug("Runlevel 2->3.");
    window.distill.runlevel += 1;

    /* 4. Register components */
    const components = [
      Abstract, Appendix, Article, Bibliography, Byline, Cite, CitationList, Code,
      Footnote, FootnoteList, FrontMatter$1, HoverBox, Title, DMath, References, TOC, Figure,
      FigureCaption, Slider, Interstitial
    ];

    const distillComponents = [DistillHeader, DistillAppendix, DistillFooter];

    if (window.distill.runlevel < 2) {
      throw new Error("Insufficient Runlevel for adding custom elements!");
    }
    const allComponents = components.concat(distillComponents);
    for (const component of allComponents) {
      console.debug("Runlevel 2: Registering custom element: " + component.is);
      customElements.define(component.is, component);
    }

    console.debug(
      "Runlevel 3: Distill Template finished registering custom elements."
    );
    console.debug("Runlevel 3->4.");
    window.distill.runlevel += 1;

    // If template was added after DOMContentLoaded we may have missed that event.
    // Controller will check for that case, so trigger the event explicitly:
    if (domContentLoaded()) {
      Controller.listeners.DOMContentLoaded();
    }

    console.debug("Runlevel 4: Distill Template initialisation complete.");
    window.distill.templateIsLoading = false;
    window.distill.templateHasLoaded = true;
  };

  window.distill = { runlevel, initialize, templateIsLoading };

  /* 0. Check browser feature support; synchronously polyfill if needed */
  if (Polyfills.browserSupportsAllFeatures()) {
    console.debug("Runlevel 0: No need for polyfills.");
    console.debug("Runlevel 0->1.");
    window.distill.runlevel += 1;
    window.distill.initialize();
  } else {
    console.debug("Runlevel 0: Distill Template is loading polyfills.");
    Polyfills.load(window.distill.initialize);
  }

})));
//# sourceMappingURL=template.v2.js.map
