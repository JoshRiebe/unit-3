//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //width and height of map display defined
    var width = 900,
        height = 500;
    
    //create svg container for the map
    var map1 = d3.select("body")
        .append("svg")
        .attr("class", "map1")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on West Africa
    var projection = d3.geoAlbers()
        .center([-3, 6])
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

    //callback function to get everything loaded at the same tiem
    function callback(data){    
        csvData = data[0];    
        africa = data[1];    
        westAfrica = data[2];
    
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
        
        //translate africa TopoJSON
        var africaCountries = topojson.feature(africa, africa.objects.AfricaShapefile),
            westAfricaCountries = topojson.feature(westAfrica, westAfrica.objects.WestAfrica).features;

        //add African countries to map
        var countries = map1.append("path")
            .datum(africaCountries)
            .attr("class", "countries")
            .attr("d", path);

        //add West African countries to map
        var regions = map1.selectAll(".regions")
            .data(westAfricaCountries)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + d.properties.Country;
            })
            .attr("d", path);
    };
};