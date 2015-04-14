#!/bin/bash
# Using closure. http://dl.google.com/closure-compiler/compiler-latest.zip
d=`pwd`
files="dataX.js dataX.parse.js"
minfile="data-x.min.js"
mapfile="$minfile.map"

echo "Input files..."
echo "  $files"
echo "Output files..."
echo "  ${minfile}"
echo "  ${mapfile}"
echo "Closure compiler..."

java -jar ./closure/compiler.jar \
  --js $files \
  --create_source_map $mapfile \
  --source_map_format=V3 \
  --js_output_file $minfile

echo "Adding mapfile delclaration to end of minfile."
cat dataX.ViewBuilder.js >> $minfile
echo "//@ sourceMappingURL=${mapfile}" >> $minfile
mv $minfile ..
mv $mapfile ..
echo "*** Done. ***"
