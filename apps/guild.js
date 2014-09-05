/**
 * guild
 */
var guild = require('./guild/guildmodel')
	, constants = require('../core/constants')
	, types = require('../node_modules/tqtopicmap/lib/types')
;

exports.plugin = function(app, environment, ppt, isPrivatePortal) {
	var myEnvironment = environment;
	var topicMapEnvironment = environment.getTopicMapEnvironment();
	var Dataprovider = topicMapEnvironment.getDataProvider();
	var GuildModel = new guild(environment);
	var CommonModel = environment.getCommonModel();
	
	var isAdmin = function(credentials) {
		console.log("BLOG.canEdit "+JSON.stringify(credentials));
		var result = false;
		if (credentials) {
			var where = credentials.indexOf(constants.ADMIN_CREDENTIALS);
			if (where > -1) {
				result = true;
			}
		}
		return result;
	};
	
	function isPrivate(req,res,next) {
		if (isPrivatePortal) {
			if (req.isAuthenticated()) {return next();}
			res.redirect('/login');
		} else {
			{return next();}
		}
	}
	function isLoggedIn(req, res, next) {
		// if user is authenticated in the session, carry on 
		console.log('ISLOGGED IN '+req.isAuthenticated());
		if (req.isAuthenticated()) {return next();}
		// if they aren't redirect them to the home page
		// really should issue an error message
		if (isPrivatePortal) {
			return res.redirect('/login');
		}
		res.redirect('/');
	}
	/////////////////
	// Menu
	/////////////////
	//environment.addApplicationToMenu("/guild","Guild");
	  /////////////////
	  // Routes
	  /////////////////
	  app.get('/guild', isPrivate,function(req,res) {
		  var data = myEnvironment.getCoreUIData(req);
		  //We can change the brand
		  data.brand = "GetTheIssues";
		  data.issuestart=0;
		  data.issuecount=constants.MAX_HIT_COUNT; //pagination size
		  data.issuetotal=0;
		  data.issuequery="/guild/index";
		  data.type = "landing";
	    res.render('issuehome',data);
	  });
	  
	  /**
	   * Fire up the blog new post form
	   */
	  app.get('/guild/new', isLoggedIn, function(req,res) {
		var data =  myEnvironment.getCoreUIData(req);
		data.formtitle = "New Guild";
	    data.isNotEdit = true;
		res.render('issueform',data); //,
	  });
	  
	  /**
	   * Fetch based on page Next and Previous buttons from ajax
	   */
	  app.get("/guild/index", isPrivate,function(req,res) {
		var start = parseInt(req.query.start);
		var count = parseInt(req.query.count);
		var credentials= [];
		if (req.user) {credentials = req.user.credentials;}

		GuildModel.fillDatatable(start,count, credentials, function(data, countsent,totalavailable) {
			console.log("Guild.index "+data);
			var cursor = start+countsent;
			var json = {};
			//pagination is based on start and count
			//both values are maintained in an html div
			json.start = cursor;
			json.count = constants.MAX_HIT_COUNT; //pagination size
			json.total = totalavailable;
			json.table = data;
			try {
				res.set('Content-type', 'text/json');
			}  catch (e) { }
			res.json(json);
		});
	  });

	  /**
	   * Function which ties the app-embedded route back to here
	   */
	  var _guildupport = function(body,usx, callback) {
		var credentials = usx.credentials;
		if (body.locator === "") {
			GuildModel.create(body, usx, credentials, function(err,result) {
				callback(err,result);
			});
		} else {
	        GuildModel.update(body, usx, credentials, function(err,result) {
	            callback(err,result);
	        });
		}
	  };
	  /**
	   * Handles posts from new and from edit
	   */
	  app.post('/guild', isLoggedIn, function(req,res) {
	    var body = req.body;
	    var usx = req.user;
	    console.log('GUILD_NEW_POST '+JSON.stringify(usx)+' | '+JSON.stringify(body));
	    _guildsupport(body, usx, function(err,result) {
	      console.log('GUILD_NEW_POST-1 '+err+' '+result);
	      //technically, this should return to "/" since Lucene is not ready to display
	      // the new post; you have to refresh the page in any case
	      return res.redirect('/issuehome');
	    });
	  });
	  
	  
	  app.get("/guild/ajaxfetch/:id", isPrivate, function(req,res) {
			//establish the node's identity
			var q = req.params.id;
			//establish credentials
			//defaults to an empty array if no user logged in
			var credentials = [];
			var usr = req.user;
			if (usr) { credentials = usr.credentials;}
			//fetch the node itself
			Dataprovider.getNodeByLocator(q, credentials, function(err,result) {
				console.log('GUILDrout-1 '+err+" "+result);
				var data =  myEnvironment.getCoreUIData(req);
				//Fetch the tags
				var tags = result.listPivotsByRelationType(types.TAG_DOCUMENT_RELATION_TYPE);
				if (!tags) {
					tags = [];
				}
				var docs=[];
				var users=[];
				var transcludes=[];
				myEnvironment.logDebug("Guild.ajaxfetch "+JSON.stringify(data));
				CommonModel.__doAjaxFetch(result, credentials,"/guild/",tags,docs,users,transcludes,data,req,function(json) {
					myEnvironment.logDebug("Guild.ajaxfetch-1 "+JSON.stringify(json));
						//send the response
						try {
							res.set('Content-type', 'text/json');
						}  catch (e) { }
						res.json(json);
				} );
			});
		  });
		  
		  /**
		   * Model Fill ViewFirst: get cycle starts here
		   */
		  app.get('/guild/:id', isPrivate,function(req,res) {
			var q = req.params.id;
			var data = myEnvironment.getCoreUIData(req);
			myEnvironment.logDebug("GUILDY "+JSON.stringify(req.query));
			CommonModel.__doGet(q,"/guild/",data, req, function(viewspec, data) {
				if (viewspec === "Dashboard") {
					return res.render('vf_topic', data);
				} else {
					return res.render('vfcn_topic',data);
				}
			});
		  });
};