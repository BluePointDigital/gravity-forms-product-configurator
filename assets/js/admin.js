(function( $ ) {
'use strict';

const GFVPCAdmin = {
field: null,
config: null,
defaults: {},
$settings: null,
$layerList: null,
layerTemplate: '',
choiceTemplate: '',

init() {
this.$settings      = $( '.visual_configurator_setting' );
this.$layerList     = this.$settings.find( '.gf-vpc-layers' );
this.layerTemplate  = $( '#gf-vpc-layer-template' ).html();
this.choiceTemplate = $( '#gf-vpc-choice-template' ).html();

$( document ).on( 'gform_load_field_settings', ( event, field ) => {
this.onFieldSettingsLoad( field );
} );

this.bindEvents();
},

bindEvents() {
$( document ).on( 'input change', '#gf-vpc-canvas-width', ( event ) => {
if ( ! this.config ) {
return;
}

const value = parseInt( event.target.value, 10 );
this.config.canvas.width = Number.isNaN( value ) ? '' : value;
this.persist();
} );

$( document ).on( 'input change', '#gf-vpc-canvas-height', ( event ) => {
if ( ! this.config ) {
return;
}

const value = parseInt( event.target.value, 10 );
this.config.canvas.height = Number.isNaN( value ) ? '' : value;
this.persist();
} );

$( document ).on( 'click', '.gf-vpc-select-media', ( event ) => {
event.preventDefault();
this.handleMediaSelect( $( event.currentTarget ) );
} );

$( document ).on( 'click', '.gf-vpc-clear-media', ( event ) => {
event.preventDefault();
this.handleMediaClear( $( event.currentTarget ) );
} );

$( document ).on( 'click', '.gf-vpc-add-layer', ( event ) => {
event.preventDefault();
this.addLayer();
} );

$( document ).on( 'click', '.gf-vpc-remove-layer', ( event ) => {
event.preventDefault();
const $layer = $( event.currentTarget ).closest( '.gf-vpc-layer' );
this.removeLayer( $layer.data( 'layerId' ) );
} );

$( document ).on( 'input', '.gf-vpc-layer-name', ( event ) => {
const $layer = $( event.currentTarget ).closest( '.gf-vpc-layer' );
const layer  = this.getLayer( $layer.data( 'layerId' ) );
if ( ! layer ) {
return;
}

layer.name = event.currentTarget.value;
this.updateLayerHeader( $layer, layer );
this.persist();
} );

$( document ).on( 'change', '.gf-vpc-layer-type', ( event ) => {
const $layer = $( event.currentTarget ).closest( '.gf-vpc-layer' );
const layer  = this.getLayer( $layer.data( 'layerId' ) );
if ( ! layer ) {
return;
}

layer.type = event.currentTarget.value;
this.updateLayerVisibility( $layer, layer );
this.updateLayerHeader( $layer, layer );
this.persist();
} );

$( document ).on( 'input', '.gf-vpc-layer-control', ( event ) => {
const layer = this.getLayer( $( event.currentTarget ).closest( '.gf-vpc-layer' ).data( 'layerId' ) );
if ( ! layer ) {
return;
}

layer.controlFieldId = event.currentTarget.value;
this.persist();
} );

$( document ).on( 'input', '.gf-vpc-layer-pos', ( event ) => {
const $input = $( event.currentTarget );
const layer  = this.getLayer( $input.closest( '.gf-vpc-layer' ).data( 'layerId' ) );
if ( ! layer ) {
return;
}

const axis = $input.data( 'axis' );
if ( ! layer.position ) {
layer.position = { x: '0', y: '0', width: '100', height: '100' };
}
layer.position[ axis ] = $input.val();
this.persist();
} );

$( document ).on( 'change', '.gf-vpc-layer-conditional-toggle', ( event ) => {
const layer = this.getLayer( $( event.currentTarget ).closest( '.gf-vpc-layer' ).data( 'layerId' ) );
if ( ! layer ) {
return;
}

layer.conditionalLogic = event.currentTarget.checked;
this.persist();
} );

$( document ).on( 'click', '.gf-vpc-add-choice', ( event ) => {
event.preventDefault();
const $layer = $( event.currentTarget ).closest( '.gf-vpc-layer' );
this.addChoice( $layer.data( 'layerId' ) );
} );

$( document ).on( 'click', '.gf-vpc-remove-choice', ( event ) => {
event.preventDefault();
const $choice = $( event.currentTarget ).closest( '.gf-vpc-choice' );
this.removeChoice( $choice );
} );

$( document ).on( 'input', '.gf-vpc-choice-value', ( event ) => {
const $choice = $( event.currentTarget ).closest( '.gf-vpc-choice' );
const layer   = this.getLayer( $choice.closest( '.gf-vpc-layer' ).data( 'layerId' ) );
if ( ! layer ) {
return;
}

const choice = this.getChoice( layer, $choice.data( 'choiceId' ) );
if ( ! choice ) {
return;
}

choice.value = event.currentTarget.value;
this.persist();
} );
},

onFieldSettingsLoad( field ) {
if ( 'visual_configurator' !== field.type ) {
this.$settings.hide();
this.field  = null;
this.config = null;
return;
}

this.field  = field;
const defaults = this.defaults && Object.keys( this.defaults ).length ? this.defaults : {};
this.config = this.cloneConfig( field.visual_configurator_settings || defaults );

if ( ! this.config.canvas ) {
this.config.canvas = { width: 600, height: 600, baseImage: { id: 0, url: '' } };
}

if ( ! Array.isArray( this.config.layers ) ) {
this.config.layers = [];
}

this.ensureIdentifiers();
this.render();

this.$settings.show();

if ( this.$layerList.data( 'ui-sortable' ) ) {
this.$layerList.sortable( 'destroy' );
}

this.$layerList.sortable( {
handle: '.dashicons-move',
placeholder: 'gf-vpc-layer-placeholder',
update: () => {
this.syncOrderFromDom();
}
} );
},

render() {
$( '#gf-vpc-canvas-width' ).val( this.config.canvas.width || '' );
$( '#gf-vpc-canvas-height' ).val( this.config.canvas.height || '' );
$( '#gf-vpc-base-image' ).val( this.config.canvas.baseImage ? this.config.canvas.baseImage.url : '' );

this.$layerList.empty();

this.config.layers.forEach( ( layer ) => {
this.$layerList.append( this.createLayerElement( layer ) );
} );

this.persist();
},

createLayerElement( layer ) {
const $layer = $( this.layerTemplate );
$layer.attr( 'data-layer-id', layer.uid );

$layer.find( '.gf-vpc-layer-name' ).val( layer.name || '' );
$layer.find( '.gf-vpc-layer-type' ).val( layer.type || 'color_fill' );
$layer.find( '.gf-vpc-layer-control' ).val( layer.controlFieldId || '' );

if ( ! layer.position ) {
layer.position = { x: '0', y: '0', width: '100', height: '100' };
}

$layer.find( '.gf-vpc-layer-pos[data-axis="x"]' ).val( layer.position.x || '' );
$layer.find( '.gf-vpc-layer-pos[data-axis="y"]' ).val( layer.position.y || '' );
$layer.find( '.gf-vpc-layer-pos[data-axis="width"]' ).val( layer.position.width || '' );
$layer.find( '.gf-vpc-layer-pos[data-axis="height"]' ).val( layer.position.height || '' );

$layer.find( '.gf-vpc-layer-conditional-toggle' ).prop( 'checked', !! layer.conditionalLogic );

const overlayUrl = layer.overlayImage && layer.overlayImage.url ? layer.overlayImage.url : '';
$layer.find( '.gf-vpc-layer-overlay-url' ).val( overlayUrl );

const $choiceList = $layer.find( '.gf-vpc-choice-list' );
$choiceList.empty();
if ( ! Array.isArray( layer.choiceMapping ) ) {
layer.choiceMapping = [];
}

layer.choiceMapping.forEach( ( choice ) => {
$choiceList.append( this.createChoiceElement( choice ) );
} );

this.updateLayerVisibility( $layer, layer );
this.updateLayerHeader( $layer, layer );

return $layer;
},

createChoiceElement( choice ) {
const $choice = $( this.choiceTemplate );
$choice.attr( 'data-choice-id', choice.uid );
$choice.find( '.gf-vpc-choice-value' ).val( choice.value || '' );
$choice.find( '.gf-vpc-choice-image' ).val( choice.image && choice.image.url ? choice.image.url : '' );

return $choice;
},

addLayer() {
if ( ! this.config ) {
return;
}

const layer = {
uid: this.generateUid( 'layer' ),
name: '',
type: 'color_fill',
controlFieldId: '',
position: { x: '0', y: '0', width: '100', height: '100' },
conditionalLogic: false,
overlayImage: { id: 0, url: '' },
choiceMapping: [],
};

this.config.layers.push( layer );
this.$layerList.append( this.createLayerElement( layer ) );
this.persist();
},

removeLayer( layerId ) {
if ( ! this.config ) {
return;
}

this.config.layers = this.config.layers.filter( ( layer ) => layer.uid !== layerId );
this.$layerList.find( `.gf-vpc-layer[data-layer-id="${ layerId }"]` ).remove();
this.persist();
},

addChoice( layerId ) {
const layer = this.getLayer( layerId );
if ( ! layer ) {
return;
}

const choice = {
uid: this.generateUid( 'choice' ),
value: '',
image: { id: 0, url: '' },
};

layer.choiceMapping.push( choice );
const $layer = this.$layerList.find( `.gf-vpc-layer[data-layer-id="${ layerId }"]` );
$layer.find( '.gf-vpc-choice-list' ).append( this.createChoiceElement( choice ) );
this.persist();
},

removeChoice( $choice ) {
const $layer = $choice.closest( '.gf-vpc-layer' );
const layer  = this.getLayer( $layer.data( 'layerId' ) );
if ( ! layer ) {
return;
}

layer.choiceMapping = layer.choiceMapping.filter( ( choice ) => choice.uid !== $choice.data( 'choiceId' ) );
$choice.remove();
this.persist();
},

handleMediaSelect( $button ) {
const target = $button.data( 'target' );
if ( ! target ) {
return;
}

const frame = wp.media( {
title: $button.data( 'title' ) || 'Select Image',
button: {
text: $button.data( 'button' ) || 'Use image',
},
multiple: false,
} );

frame.on( 'select', () => {
const attachment = frame.state().get( 'selection' ).first().toJSON();
this.assignMedia( $button, target, attachment );
} );

frame.open();
},

handleMediaClear( $button ) {
const target = $button.data( 'target' );
const $wrapper = $button.closest( '.gf-vpc-media-control' );
$wrapper.find( 'input[type="text"]' ).val( '' );

if ( 'baseImage' === target && this.config ) {
this.config.canvas.baseImage = { id: 0, url: '' };
} else if ( 'overlayImage' === target ) {
const layer = this.getLayer( $button.closest( '.gf-vpc-layer' ).data( 'layerId' ) );
if ( layer ) {
layer.overlayImage = { id: 0, url: '' };
}
} else if ( 'choiceImage' === target ) {
const $choice = $button.closest( '.gf-vpc-choice' );
const layer   = this.getLayer( $choice.closest( '.gf-vpc-layer' ).data( 'layerId' ) );
if ( layer ) {
const choice = this.getChoice( layer, $choice.data( 'choiceId' ) );
if ( choice ) {
choice.image = { id: 0, url: '' };
}
}
}

this.persist();
},

assignMedia( $button, target, attachment ) {
const data = { id: attachment.id, url: attachment.url };
const $wrapper = $button.closest( '.gf-vpc-media-control' );
$wrapper.find( 'input[type="text"]' ).val( attachment.url );

if ( 'baseImage' === target && this.config ) {
this.config.canvas.baseImage = data;
} else if ( 'overlayImage' === target ) {
const layer = this.getLayer( $button.closest( '.gf-vpc-layer' ).data( 'layerId' ) );
if ( layer ) {
layer.overlayImage = data;
}
} else if ( 'choiceImage' === target ) {
const $choice = $button.closest( '.gf-vpc-choice' );
const layer   = this.getLayer( $choice.closest( '.gf-vpc-layer' ).data( 'layerId' ) );
if ( layer ) {
const choice = this.getChoice( layer, $choice.data( 'choiceId' ) );
if ( choice ) {
choice.image = data;
}
}
}

this.persist();
},

updateLayerHeader( $layer, layer ) {
const title = layer.name ? `${ layer.name }` : 'Layer';
const type  = layer.type ? layer.type.replace( /_/g, ' ' ) : '';
$layer.find( '.gf-vpc-layer-title' ).text( `${ title }${ type ? ' · ' + type : '' }` );
},

updateLayerVisibility( $layer, layer ) {
const type = layer.type || 'color_fill';
$layer.find( '.gf-vpc-layer-overlay' ).toggle( 'image_overlay' === type );
$layer.find( '.gf-vpc-layer-choice-mapping' ).toggle( 'image_choice' === type );
},

syncOrderFromDom() {
const order = [];
this.$layerList.find( '.gf-vpc-layer' ).each( ( index, element ) => {
order.push( $( element ).data( 'layerId' ) );
} );

const layers = [];
order.forEach( ( id ) => {
const layer = this.getLayer( id );
if ( layer ) {
layers.push( layer );
}
} );

this.config.layers = layers;
this.persist();
},

getLayer( layerId ) {
if ( ! this.config || ! Array.isArray( this.config.layers ) ) {
return null;
}

return this.config.layers.find( ( layer ) => layer.uid === layerId ) || null;
},

getChoice( layer, choiceId ) {
if ( ! layer || ! Array.isArray( layer.choiceMapping ) ) {
return null;
}

return layer.choiceMapping.find( ( choice ) => choice.uid === choiceId ) || null;
},

persist() {
if ( ! this.field || ! this.config ) {
return;
}

this.field.visual_configurator_settings = this.cloneConfig( this.config );
if ( 'function' === typeof SetFieldProperty ) {
SetFieldProperty( 'visual_configurator_settings', this.cloneConfig( this.config ) );
}
$( '#visual_configurator_settings' ).val( JSON.stringify( this.config ) );
},

ensureIdentifiers() {
this.config.layers.forEach( ( layer ) => {
if ( ! layer.uid ) {
layer.uid = this.generateUid( 'layer' );
}
if ( ! layer.position ) {
layer.position = { x: '0', y: '0', width: '100', height: '100' };
}
if ( ! Array.isArray( layer.choiceMapping ) ) {
layer.choiceMapping = [];
}
layer.choiceMapping.forEach( ( choice ) => {
if ( ! choice.uid ) {
choice.uid = this.generateUid( 'choice' );
}
if ( ! choice.image ) {
choice.image = { id: 0, url: '' };
}
} );
} );
},

generateUid( prefix ) {
return `${ prefix }_${ Math.random().toString( 36 ).substr( 2, 9 ) }`;
},

cloneConfig( source ) {
if ( ! source ) {
return {};
}

return JSON.parse( JSON.stringify( source ) );
},
};

$( () => {
GFVPCAdmin.defaults = window.GFVisualConfiguratorDefaults || {};
GFVPCAdmin.init();
} );

})( jQuery );
