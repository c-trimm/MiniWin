/*
 * MiniWin
 * Author: Casey Trimm
 * Created: June 2010
 *
 * Dependencies:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *  jquery.ui.button.js
 *	jquery.ui.draggable.js
 *	jquery.ui.mouse.js
 *	jquery.ui.position.js
 *	jquery.ui.resizable.js
 *	jquery.ui.dialog.js
 */
(function( $ ) {
	$.widget("ui.miniWin", {
		options: {
			taskbar: "#taskbar",
			uniqueID: false,
			state: false,
			dialogOps: {}
		},
		
		_create : function() {
			var self = this, ops = this.options, el = this.element, tb = $(ops.taskbar);
			
			
			// SET OPTIONS AND DEFAULTS \\
			
				self.state = {
					minimized : false,
					title : el.attr("title"),
					content : el.html()
				};
			
				// Default Dialog Options
				var dialogOps = {
					width: 300,
					height: 300,
					show: "drop",
					hide: "drop",
					autoOpen: false,
					modal: false
				};
				
				// Extend dialogOps with ops.dialogOps so that user dialog options override defaults.
				$.extend(dialogOps, ops.dialogOps);
				ops.dialogOps = dialogOps;
				
				// Set up taskbar
				self.$taskbar = (tb.length > 0) ? tb : false;
				
				if (self.$taskbar)
					self.taskButton = self._taskbutton();
				
				// On certain dialog events, we want to execute methods, so we extend the dialog options with our methods.
				$.extend(ops.dialogOps,{
					focus: function(event, ui) {
						// Make all task buttons inactive then activate this window's button.
						$(ops.taskbar).children(".taskbutton").removeClass("ui-state-active");
						self.taskButton.element.addClass("ui-state-active");
						
						// Remove shadows and dim titlebars of all other dialog windows
						$(".ui-dialog").removeClass("miniWin-shadow").find(".ui-dialog-titlebar").stop().animate({
							"opacity": ".5",
							"filter" : "progid:DXImageTransform.Microsoft.alpha(opacity=50)"
						}, "fast");
						
						// Add shadow and brighten titlebar for this window.
						self.$frame.addClass("miniWin-shadow").find(".ui-dialog-titlebar").stop().animate({
							"opacity" : "1",
							"filter" : "progid:DXImageTransform.Microsoft.alpha(opacity=100)"
						}, "fast");
					},
					open: function(event, ui) {
						if (self.state.minimized)
							self.minimize();
					},
					close: function(event, ui) {
						el.trigger("close");
						self._destroy();
					}
				});
			
			
			
			// MAKE THE DIALOG WINDOW \\
				
			
				el.dialog(ops.dialogOps);
				
				// Create references to the window's outer frame (for position/sizing) and title (for ease of changing).
				self.$frame = el.parent().attr("id",ops.uniqueID);
				self.$title = self.$frame.find(".ui-dialog-title");
				
				// Our element needs a unique ID. If one was not supplied, loop through all dialogs to find the highest
				// Add one to the highest and that becomes our new dialog's unique id.
				if (ops.uniqueID === false) {
					var highest = -1;
					var thisID;
					
					$(".ui-dialog").each(function() {
						thisID = parseInt($(this).attr("id"));
						if (thisID > highest)
							highest = thisID;
					});
					
					highest++;
					
					this.id = highest;
					self.$frame.attr("id",highest);
				}
				else
					this.id = ops.uniqueID;
	
				
				// Style the Title Bar
				// Because of the nature of the titlebar in the dialog element, 
				// we need to less the corner radius of the title bar by one.
				var borderRad = parseInt(self.$frame.css("padding",0).css("border-top-left-radius")) - 1;
				borderRad = borderRad + "px";
				
				self.$frame.find(".ui-dialog-titlebar").removeClass("ui-corner-all").addClass("ui-corner-top").css({
					"border-top" : "0",
					"border-left" : "0",
					"border-right" : "0",
					"-moz-border-radius-topleft" : borderRad,
					"-webkit-border-top-left-radius" : borderRad,
					"border-top-left-radius" : borderRad,
					"-moz-border-radius-topright" : borderRad,
					"-webkit-border-top-right-radius" : borderRad, 
					"border-top-right-radius" : borderRad
				});
				
				// Create and append the minimize button to window's title bar.
				// Do not append if the window is modal, or if if there is no taskbar.
				if (!ops.dialogOps.modal && self.$taskbar) {
					var $minimizeButton = $('<a href="#" class="ui-dialog-titlebar-close ui-corner-all minimize-button" role="button" unselectable="on" style="-moz-user-select: none; margin-right: 20px;">' + 
										   		'<span class="ui-icon ui-icon-minus" unselectable="on" style="-moz-user-select: none;">close</span>' + 
										    '</a>');
					
					$minimizeButton.hover(function() { $(this).toggleClass("ui-state-hover"); });
					$minimizeButton.click(function() { self.minimize(); });
					
					self.$title.after($minimizeButton);
				}
				
				
				
				// Bind function to save state on certain events
				el.bind("minimize", function() {
					self._saveState();
				});

				el.bind("normalize", function() {
					self._saveState();
				});

				el.bind("dialogdragstop", function() {
					self._saveState();
				});

				el.bind("dialogresizestop", function() {
					self._saveState();
				});
		},
 
		_destroy : function() {
			var self = this, ops = this.options, el = this.element;
			
			self.taskButton.kill();
			el.remove();
			
			// call the base destroy function
			$.Widget.prototype.destroy.call( this );
		},
		
		_taskbutton : function() {
			var self = this, ops = this.options, el = this.element;
			
			return new function() {
				this.element = $('<button role="button" aria-disabled="false" />').addClass(
																			"ui-button " +
																			"ui-widget " +
																			"ui-state-default " +
																			"ui-corner-all " +
																			"ui-button-text-only " +
																			"taskbutton");
				this.buttonText = $('<span class="ui-button-text">' + self.state.title + '</span>');
				this.element.append(this.buttonText);
				
				this.element.click(function() {
					// Record the old z-index and then move it to the front.
					var oldZ = self.$frame.css("z-index");
					el.dialog("moveToTop");
					
					// Disable all buttons and enable the one that was just clicked (this one)
					$(ops.taskbar).children(".taskbutton").removeClass("ui-state-active");
					
					// If there is no display, it's minimized. Normalize it.
					if (self.state.minimized) {
						self.normalize();
						$(this).addClass("ui-state-active");
					}
					else {
						// If the old and new z-index's are the same, minimize.
						if ((parseInt(oldZ) + 1) === parseInt(self.$frame.css("z-index")))
							self.minimize();
						else
							$(this).addClass("ui-state-active");
					}					
				});
				
				this.element.hover(function() {
					$(this).toggleClass("ui-state-hover");
				});
				
				this.text = function(words) {	
					var thisName = words.substring(0,10);
					
					if (words.length > 10) {
						thisName = words.substring(0,7) + "...";
					}
					
					this.buttonText.html(thisName);
				};
				
				this.kill = function() {
					this.element.remove();	
				};
			};
		},
		
		minimize: function() {
			var self = this, ops = this.options, el = this.element,
				tbPos = self.taskButton.element.offset();
			
			self.state.minimized = true;
			
			self.$frame.animate({
				"left" : (tbPos.left) + (self.taskButton.element.width() / 2),
				"top" : (tbPos.top) + (self.taskButton.element.height() / 2),
				"width": 0,
				"height": 0
			},"slow");

			self.taskButton.element.removeClass("ui-state-active");
			
			el.trigger("minimize");
		},
		
		normalize: function() {
			var self = this, ops = this.options, el = this.element;
			
			var tbPos = self.taskButton.element.offset();
			
			self.state.minimized = false;

			self.$frame.css({
				"left" : (tbPos.left) + (self.taskButton.element.width() / 2),
				"top" : (tbPos.top) + (self.taskButton.element.height() / 2)
			});
			
			self.$frame.animate({
				"left" : self.state.pos.left,
				"top" : self.state.pos.top,
				"width": self.state.dim.width,
				"height": self.state.dim.height
			},"slow", function() {
				el.trigger("normalize");
			});
			
			
			//el.dialog("focus");
		},
		
		chTitle: function(newTitle) {
			var self = this, el = this.element;
			
			el.dialog("option", "title",newTitle);
			self.taskButton.text(newTitle);
			
			self.state.title = newTitle;
		},
		
		open: function() {
			var self = this, ops = this.options, el = this.element;
			
			self.taskButton.element.addClass("ui-state-active");
			$(ops.taskbar).append(self.taskButton.element);
			
			if (ops.state)
				this._loadState();
			
			el.dialog("open");
		},
		
		close: function() {
			this.element.remove();
		},
		
		getState: function() {
			this._updateState();
			return this.state;
		},
		
		getID: function() {
			return this.id;
		},
		
		_updateState: function() {
			var self = this, ops = this.options, el = this.element;
			
			this.state.pos = self.$frame.offset();
			this.state.zIndex = parseInt(self.$frame.css("zIndex"));
			this.state.dim = { width : self.$frame.width(), height : self.$frame.height() };
			this.state.content = el.html();
			this.state.title = this.$title.html();
		},
		
		_saveState: function() {
			this._updateState();
			this.element.trigger("saveState");
		},
		
		_loadState: function() {
			var self = this, ops = this.options, el = this.element;
			
			var state = self.state = ops.state;

			el.dialog("option",{
				position: [state.pos.left,  state.pos.top],
				zIndex: state.zIndex,
				width: state.dim.width,
				height: state.dim.height
			});
			
			el.html(state.content);
			this.chTitle(state.title);
		}
	
	}); 
})(jQuery);