# Faded Island Game
## Project Structure

- **index.html**
- **Tiled**<br/>
  *(the folder for Tiled maps, defined tileset workfiles and tileset images* <br/>
  *all the workfiles should be exported as .json files)*
    - **map**<br/>
    *(here are all the tile maps, one .tmx and one .json file for each)*
    - **tileset_images**<br/>
    *(all tileset images should be kept here as .png. these are used by the Tiled and the game as well)*
    - **tileset_workfiles**<br/>
    *(all tileset workfiles saved by Tile will be kept here only as .json files)*
    - **object_workfiles**<br/>
    *(template objects defined inside Tile create these workfiles, kept here as .json files)*
- **js, css and img**<br/>
  *(all the scripts, stylesheets and game images other than tileset images are kept in their separate folders)*

# DOCUMENTATION

## Utilities
- **xStats**<br/>
  *A little utility that shows the FPS, memory used by the game*<br/>
- **EventEmitter**<br/>
  *A class that simply adds aliases to the EventTarget DOM class*<br/>
  <br/>
  *API :*<br/>
  *`addEventListener(eventName, handler)` from the EventTarget*<br/>
  *`on(eventName, handler)` just an alias for addEventListener -> it reads shorter*<br/>
  *`emit(eventName, detail)` dispatches the `eventName` event and sends the detail object to the subscribed handler*<br/>
  *the handler with event parameter 'e' will access the sent object in the e.detail property*<br/>
- **ResourceLoader**<br/>
 *A loader for the game resources. It loads images, .xml and .json files*<br/>
 </br>
 *API:*<br/>
 *to start loading resources the `add` function should be called with an array of resource objects like the following:*<br/>
 <br/>
 ```
 var RESOURCES = [
	{
		name : "resource1Name",
		itemType : "img",
		url : "filepath/file.png"
	},
	{
		name : "resource2Name",
		itemType : "JSON",
		url : "filepath/file2.json"
	},
	{
		name : "resource2Name",
		itemType : "XML",
		url : "filepath/file3.xml"
	}
 ];
 ```
## Game Classes

## Tiled
