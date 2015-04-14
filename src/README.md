# data-x src

Using closure compiler to minify and create sourcemap. dataX.ViewBuilder.js and dataX.high.js cannot be minified
because they use a comment hack.  Concating ViewBuilder to the minified source for now.

To build the minified file run ./build.sh

To work with the minified file.
&lt;script type="text/javascript" src="data-x/data-x.min.js"&gt;&lt;/script&gt;

To work with the raw files include them in this order.
&lt;script type="text/javascript" src="data-x/src/dataX.js"&gt;&lt;/script&gt;
&lt;script type="text/javascript" src="data-x/src/dataX.parse.js"&gt;&lt;/script&gt;
&lt;script type="text/javascript" src="data-x/src/dataX.ViewBuilder.js"&gt;&lt;/script&gt;

If you're making a demo and need highlighter include this file.
&lt;script type="text/javascript" src="data-x/src/dataX.high.js"&gt;&lt;/script&gt;

