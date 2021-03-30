// D3 Lab, week 9 activity
//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 960,
        height = 660;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on washington
    var projection = d3.geoAlbers()
        .center([0, 47.45])
        .rotate([121.88, 0, 0])
        .parallels([42.5, 52.5])
        .scale(48000)
        .translate([width / 2, height / 2]);
    
    var path = d3.geoPath() // path generator
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
/*     var promises = [d3.csv("data/Tract_join_FINAL.csv"),                    
                    d3.json("data/EU_withcrs.topojson"),             //"data/EU_King_Co_stripped.topojson"       
                    d3.json("data/Trails_withcrs.topojson")                   //"data/Trails_stripped.topojson"
                    ];    
    Promise.all(promises).then(callback); */
    var promises = [];    
    promises.push(d3.csv("data/Tract_join_FINAL.csv")); //load attributes from csv  
    promises.push(d3.json("data/wa_co.topojson"));  
    promises.push(d3.json("data/EU_withcrs.topojson")); //load background spatial data    
    promises.push(d3.json("data/Trails_withcrs.topojson")); //load choropleth spatial data    
    Promise.all(promises).then(callback);
    
    // add callback function within setMap so we can make use of local variable to be added later
    function callback(data){    
        csv = data[0];
        wa = data[1];     
        kingCo = data[2];    
        trails = data[3];
        console.log(csv);
        console.log(wa);
        console.log(kingCo);
        console.log(trails);    

        //create graticule generator
        var graticule = d3.geoGraticule()
            .step([1, 1]); //place graticule lines every 5 degrees of longitude and latitude
                //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path); //project graticule
            //create graticule lines
        // var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        //     .data(graticule.lines()) //bind graticule lines to each element to be created
        //     .enter() //create an element for each datum
        //     .append("path") //append each element to the svg as a path element
        //     .attr("class", "gratLines") //assign class for styling
        //     .attr("d", path); //project graticule lines
        //console.log(gratLines);

        //translate TopoJSONs
        var wash = topojson.feature(wa, wa.objects.wa_co).features,
            censusTract = topojson.feature(kingCo, kingCo.objects.EU_King_Co_stripped).features,
            trails = topojson.feature(trails, trails.objects.Trails_stripped).features;

        console.log(censusTract);
        console.log(trails);
        console.log(wash);
        
        var state = map.selectAll(".state")
            .data(wash)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "state " + d.properties.OBJECTID;
            })
            .attr("d", path);

        //add census tract regions to map
        var tracts = map.selectAll(".tracts")
            .data(censusTract)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "tract " + d.properties.OBJECTID;
            })
            .attr("d", path);

        //add trails  to map
        var trailMap = map.selectAll(".trails")
            .data(trails)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "trail " + d.properties.OBJECTID;
            })
            .attr("d", path)
            .attr("fill", "none");

    };
};

