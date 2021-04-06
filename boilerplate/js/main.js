//self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Exports of Goods and Services", "Imports of Goods and Services", "Gross Savings", "Fiscal Revenue, excluding grants", "Investments", "Fiscal Expenditures"]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //width and height of map display defined
    var width = window.innerWidth * .525,
        height = 500;

    //create svg container for the map
    var map1 = d3.select("body")
        .append("svg")
        .attr("class", "map1")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on West Africa
    var projection = d3.geoAlbers()
        .center([-5, 6])
        .rotate([-2, 0, 0])
        .parallels([6, 30])
        .scale(1000)
        .translate([width / 2, height / 1.25]);

    //path generator for projection
    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading  
    var promises = [];
    promises.push(d3.csv("data/WestAfrica_IMF.csv"));                    
    promises.push(d3.json("data/AfricaShapefile.topojson"));                    
    promises.push(d3.json("data/WestAfrica.topojson"));
    Promise.all(promises).then(callback);

    //callback function to get everything loaded at the same time
    function callback(data){    

        var csvData = data[0], africa = data[1], westAfrica = data[2];

        //place graticule on map
        setGraticule(map1, path);
  
        //translate Africa and West Africa TopoJSONs
        var africaCountries = topojson.feature(africa, africa.objects.AfricaShapefile),
            westAfricaCountries = topojson.feature(westAfrica, westAfrica.objects.WestAfrica).features;
        console.log(westAfricaCountries);
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
        setEnumerationUnits(westAfricaCountries, map1, path);
        
        //add coordinated visualization to map
        /* setChart(csvData, colorScale); */
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

function joinData(westAfricaCountries, csvData){
    
    //loop through csv to assign each set of csv attribute values to geojson country
    for (var i = 0; i < csvData.length; i++){
        var csvRegion = csvData[i]; //the current country
        console.log(csvRegion);
        var csvKey = csvRegion.FID; //the CSV primary key
        console.log(csvKey);
        //loop through geojson westAfricaCountries to find correct country
        for (var a = 0; a < westAfricaCountries.length; a++){

            var geojsonProps = westAfricaCountries[a].properties; //the current country geojson properties
            console.log(geojsonProps);
            var geojsonKey = geojsonProps.FID; //the geojson primary key
            console.log(geojsonKey);
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

    return westAfricaCountries;
};

//function to create color scale generator
function makeColorScale(data){
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

    return colorScale;
};

function setEnumerationUnits(westAfricaCountries, map1, path, colorScale){
    
    //add West African countries to map
    var regions = map1.selectAll(".regions")
        .data(westAfricaCountries)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.FID;
        })
        .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }                
            });
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){

    //chart frame dimensions
    var chartWidth = window.innerWidth * .4,
        chartHeight = 500;

    //create second svg element to hold bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([0, chartHeight])
        .domain([0, 105]);

    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.FID;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .attr("height", function(d){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.FID;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        })
        .text(function(d){
            return d[expressed];
        });

        //create text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed[3] + " (percent of GDP) in each country");
};
})();