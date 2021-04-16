//self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Exports of Goods and Services", "Fiscal Expenditures", "Fiscal Revenue, excluding grants", "Gross Savings", "Imports of Goods and Services", "Investments"]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//chart frame dimensions
var chartWidth = window.innerWidth * .4,
    chartHeight = 500,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([490, 0])
    .domain([0, 80]);

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //width and height of map display defined
    var width = window.innerWidth * .525,
        height = 490;

    //create svg container for the map
    var map1 = d3.select("body")
        .append("svg")
        .attr("class", "map1")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on West Africa
    var projection = d3.geoAlbers()
        .center([-5, 10.5])
        .rotate([-2, 0, 0])
        .parallels([6, 30])
        .scale(845)
        .translate([width / 2, height / 1.25]);

    //path generator for projection
    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading  
    var promises = [];
    promises.push(d3.csv("data/WestAfrica_IMF.csv"));                    
    promises.push(d3.json("data/AfricaShapefile.topojson"));                    
    promises.push(d3.json("data/WestAfrica3.topojson"));
    Promise.all(promises).then(callback);

    //callback function to get everything loaded at the same time
    function callback(data){    

        //assigning CSV and TopoJSON to different variables
        var csvData = data[0], africa = data[1], westAfrica = data[2];

        //place graticule on map
        setGraticule(map1, path);
  
        //translate Africa and West Africa TopoJSONs
        var africaCountries = topojson.feature(africa, africa.objects.AfricaShapefile),
            westAfricaCountries = topojson.feature(westAfrica, westAfrica.objects.WestAfrica).features;
        
        //add African countries to map
        var countries = map1.append("path")
            .datum(africaCountries)
            .attr("class", "countries")
            .attr("d", path);

        //join csv data to GeoJSON enumeration units
        westAfricaCountries = joinData(westAfricaCountries, csvData);

        //create color scale
        var colorScale = makeColorScale(csvData);

        //add enumeration units to map
        setEnumerationUnits(westAfricaCountries, map1, path, colorScale);
        
        //add coordinated visualization to map
        setChart(csvData, colorScale);

        //add Dropdown menu to map
        createDropdown(csvData);
    };
};

//function to determine the map's graticule
function setGraticule(map1, path){
    
    //create graticule
    var graticule = d3.geoGraticule()
        .step([5, 5]);

    //create ocean background
    var gratBackground = map1.append("path")
        .datum(graticule.outline())
        .attr("class", "gratBackground")
        .attr("d", path);

    //create graticule lines
    var gratLines = map1.selectAll(".gratLines")
        .data(graticule.lines())
        .enter()
        .append("path")
        .attr("class", "gratLines")
        .attr("d", path);
};

//function to join CSV data with TopoJSON
function joinData(westAfricaCountries, csvData){
    
    //loop through csv to assign each set of csv attribute values to geojson country
    for (var i = 0; i < csvData.length; i++){
        var csvRegion = csvData[i]; //the current country
        var csvKey = csvRegion.ID; //the CSV primary key
       
        //loop through geojson westAfricaCountries to find correct country
        for (var a = 0; a < westAfricaCountries.length; a++){
            var geojsonProps = westAfricaCountries[a].properties; //the current country geojson properties
            var geojsonKey = geojsonProps.ID; //the geojson primary key
            
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };

    //returns joined data for implementation
    return westAfricaCountries;
};

//function to create color scale generator
function makeColorScale(data){
    
    //array of color values for choropleth map
    var colorClasses = [
        "#EDF8E9",
        "#C7E9C0",
        "#A1D99B",
        "#74C476",
        "#31A354",
        "#006D2C"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    
    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i = 0; i < data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    //returns color scale to be implemented
    return colorScale;
};

//function to add color to the countries
function setEnumerationUnits(westAfricaCountries, map1, path, colorScale){
    
    //add West African countries to map and add color to each country based on joined CSV data
    var regions = map1.selectAll(".regions")
        .data(westAfricaCountries)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + "a" + d.properties.ID;
        })
        .attr("d", path)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }                
        })

        //mouseover code for the map
        .on("mouseover", function(event, d){
            highlight(d.properties);
        })
        .on("mouseout", function(event, d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel)
        var desc = regions.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){

    //create second svg element to hold bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    
    //create rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bars for each country
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]- a[expressed]
        }) 
        .attr("class", function(d){
            return "bars " + "a" + d.ID;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        
        //mouseover code for the bars
        .on("mouseover", function(event, d){
            highlight(d)
        })
        .on("mouseout", function(event, d){
            dehighlight(d);
        })
        .on("mousemove", moveLabel)
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

    //create text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 50)
        .attr("y", 30)
        .attr("class", "chartTitle")
        .text("Attribute (percent of GDP) in each country");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bar positions, heights and colors
    updateChart(bars, csvData.length, colorScale);
};

//function to create dropdown menu for attribute selection
function createDropdown(csvData){
    
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//function for dropdown change event handler
function changeAttribute(attribute, csvData) {
    
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var regions = d3.selectAll(".regions")
        .transition()
        .duration(1000)
        .style("fill", function (d) {
            var value = d.properties[expressed];
            if (value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
        });

    //Sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        
        //Sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition()
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);

        updateChart(bars, csvData.length, colorScale);
};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        
        //size/resize bars
        .attr("height", function(d, i){
            return 490 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        
        //color/recolor bars
        .style("fill", function(d){            
            var value = d[expressed];            
            if(value) {                
                return colorScale(value);            
            } else {                
                return "#ccc";            
            }    
        });

    var chartTitle = d3.select(".chartTitle")
        .text(expressed + " (percent of GDP) in each country");
};

//function to highlight enumeration units and bars
function highlight(props){
    
    //change stroke
    var selected = d3.selectAll("." + "a" + props.ID)
        .style("stroke", "gold")
        .style("stroke-width", "2.5");

    //call label function for dynamic label with mouseover    
    setLabel(props);
};

//function to reset element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + "a" + props.ID)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };

    //remove label information with mouseout
    d3.select(".infolabel")
        .remove();
};

//function to create dynamic label
function setLabel(props){
    
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.ID + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.SOVEREIGNT);
};

//function to move info label with mouse
function moveLabel(){
    
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10,
        y1 = event.clientY - 75,
        x2 = event.clientX - labelWidth - 10,
        y2 = event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1; 
    
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

})();