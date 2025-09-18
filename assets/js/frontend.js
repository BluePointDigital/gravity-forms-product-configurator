(function() {
'use strict';

function parseJSON( value ) {
try {
return JSON.parse( value );
} catch ( error ) {
console.error( 'GF Visual Configurator: Unable to parse configuration.', error );
return null;
}
}

function clone( source ) {
return JSON.parse( JSON.stringify( source || {} ) );
}

class VisualConfigurator {
constructor( element ) {
this.element      = element;
this.canvas       = element.querySelector( '.gf-vpc-canvas' );
this.context      = this.canvas ? this.canvas.getContext( '2d' ) : null;
this.hiddenInput  = element.querySelector( '.gf-vpc-result' );
this.formId       = parseInt( element.getAttribute( 'data-form-id' ), 10 );
this.fieldId      = parseInt( element.getAttribute( 'data-field-id' ), 10 );
this.form         = element.closest( 'form' );
this.imageCache   = new Map();
this.layerStates  = new Map();
this.drawScheduled = false;
}

init() {
if ( ! this.canvas || ! this.context ) {
return;
}

const configValue = this.element.getAttribute( 'data-config' );
const config      = configValue ? parseJSON( configValue ) : null;

if ( ! config ) {
return;
}

this.config = clone( config );
this.prepareLayers();
this.bindLayerControls();
this.redrawCanvas();
this.bindFormSubmit();
}

prepareLayers() {
if ( ! this.config.canvas ) {
this.config.canvas = { width: this.canvas.width, height: this.canvas.height, baseImage: { url: '' } };
}

if ( this.config.canvas.width ) {
this.canvas.width = parseInt( this.config.canvas.width, 10 );
}

if ( this.config.canvas.height ) {
this.canvas.height = parseInt( this.config.canvas.height, 10 );
}

if ( ! Array.isArray( this.config.layers ) ) {
this.config.layers = [];
}

this.config.layers.forEach( ( layer, index ) => {
if ( ! layer.uid ) {
layer.uid = 'layer_' + ( index + 1 );
}

if ( ! layer.position ) {
layer.position = { x: '0', y: '0', width: '100', height: '100' };
}
} );
}

bindLayerControls() {
this.config.layers.forEach( ( layer ) => {
const controls = this.findControls( layer.controlFieldId );
const state    = this.getLayerState( layer );

state.controls = controls;

controls.forEach( ( control ) => {
const handler = ( event ) => {
if ( control.type && 'file' === control.type.toLowerCase() ) {
this.handleFileControl( layer, control );
} else {
this.scheduleRedraw();
}
};

control.addEventListener( 'change', handler );
if ( control.tagName === 'INPUT' ) {
control.addEventListener( 'input', handler );
}
} );
} );
}

bindFormSubmit() {
if ( ! this.form ) {
return;
}

this.form.addEventListener( 'submit', () => {
this.updateResultField();
} );
}

findControls( controlFieldId ) {
if ( ! controlFieldId || ! this.form ) {
return [];
}

const controls = new Set();
const nameSelectors = [ `input_${ controlFieldId }`, `input_${ controlFieldId }[]` ];

nameSelectors.forEach( ( name ) => {
const matches = this.form.querySelectorAll( `[name="${ name }"]` );
matches.forEach( ( element ) => {
if ( element.type && element.type.toLowerCase() === 'hidden' ) {
return;
}
controls.add( element );
} );
} );

const fieldWrapperId = `field_${ this.formId }_${ controlFieldId }`;
const fieldWrapper   = document.getElementById( fieldWrapperId );

if ( fieldWrapper ) {
fieldWrapper.querySelectorAll( 'input, select, textarea' ).forEach( ( element ) => {
if ( element.type && element.type.toLowerCase() === 'hidden' ) {
return;
}
controls.add( element );
} );
}

return Array.from( controls );
}

getLayerState( layer ) {
const key = layer.uid || layer.controlFieldId || Math.random().toString( 36 ).slice( 2 );
if ( ! this.layerStates.has( key ) ) {
this.layerStates.set( key, { uploadData: '' } );
}

return this.layerStates.get( key );
}

scheduleRedraw() {
if ( this.drawScheduled ) {
return;
}

this.drawScheduled = true;
window.requestAnimationFrame( () => {
this.drawScheduled = false;
this.redrawCanvas();
} );
}

handleFileControl( layer, control ) {
const files = control.files;
if ( ! files || ! files.length ) {
const state = this.getLayerState( layer );
state.uploadData = '';
this.scheduleRedraw();
return;
}

const reader = new FileReader();
reader.onload = () => {
const state = this.getLayerState( layer );
state.uploadData = reader.result;
this.scheduleRedraw();
};
reader.readAsDataURL( files[0] );
}

async redrawCanvas() {
if ( ! this.context ) {
return;
}

const width  = this.canvas.width;
const height = this.canvas.height;

this.context.clearRect( 0, 0, width, height );

const baseImageUrl = this.getBaseImageUrl();
if ( baseImageUrl ) {
await this.drawImage( baseImageUrl, { x: 0, y: 0, width, height } );
}

for ( const layer of this.config.layers ) {
await this.drawLayer( layer );
}

this.updateResultField();
}

getBaseImageUrl() {
if ( ! this.config || ! this.config.canvas || this.config.canvas.baseImage === undefined ) {
return '';
}

const baseImage = this.config.canvas.baseImage;
if ( typeof baseImage === 'string' ) {
return baseImage;
}

return baseImage && baseImage.url ? baseImage.url : '';
}

async drawLayer( layer ) {
const type = layer.type || 'color_fill';
const rect = this.getLayerRect( layer );

switch ( type ) {
case 'color_fill':
this.drawColorLayer( layer, rect );
break;
case 'image_upload':
await this.drawUploadLayer( layer, rect );
break;
case 'image_choice':
await this.drawChoiceLayer( layer, rect );
break;
case 'image_overlay':
await this.drawOverlayLayer( layer, rect );
break;
default:
break;
}
}

drawColorLayer( layer, rect ) {
const value = this.getControlValue( layer );
if ( ! value ) {
return;
}

this.context.save();
this.context.fillStyle = value;
this.context.fillRect( rect.x, rect.y, rect.width, rect.height );
this.context.restore();
}

async drawUploadLayer( layer, rect ) {
const state = this.getLayerState( layer );
if ( ! state.uploadData ) {
return;
}

await this.drawImage( state.uploadData, rect );
}

async drawChoiceLayer( layer, rect ) {
const value = this.getControlValue( layer );
if ( ! value ) {
return;
}

const mappings = Array.isArray( layer.choiceMapping ) ? layer.choiceMapping : [];
const match    = mappings.find( ( item ) => item.value === value );
const imageUrl = match && match.image ? match.image.url : '';

if ( imageUrl ) {
await this.drawImage( imageUrl, rect );
}
}

async drawOverlayLayer( layer, rect ) {
const imageUrl = layer.overlayImage && layer.overlayImage.url ? layer.overlayImage.url : '';
if ( imageUrl ) {
await this.drawImage( imageUrl, rect );
}
}

getControlValue( layer ) {
const state = this.getLayerState( layer );
const controls = state.controls || [];
if ( ! controls.length ) {
return '';
}

const primary = controls[0];
if ( primary.type && primary.type.toLowerCase() === 'file' ) {
return state.uploadData || '';
}

if ( primary.tagName === 'SELECT' ) {
return primary.value;
}

if ( primary.type && primary.type.toLowerCase() === 'radio' ) {
const checked = controls.find( ( control ) => control.checked );
return checked ? checked.value : '';
}

return primary.value;
}

getLayerRect( layer ) {
const position = layer.position || {};
const width    = this.canvas.width;
const height   = this.canvas.height;

const parsePercent = ( value, fallback ) => {
if ( value === undefined || value === null || value === '' ) {
return fallback;
}

let numeric = value;
if ( typeof numeric === 'string' ) {
numeric = numeric.trim();
if ( numeric.endsWith( '%' ) ) {
numeric = numeric.slice( 0, -1 );
}
}

numeric = parseFloat( numeric );
return Number.isNaN( numeric ) ? fallback : numeric;
};

const xPercent      = parsePercent( position.x, 0 );
const yPercent      = parsePercent( position.y, 0 );
const widthPercent  = parsePercent( position.width, 100 );
const heightPercent = parsePercent( position.height, 100 );

return {
x: ( xPercent / 100 ) * width,
y: ( yPercent / 100 ) * height,
width: ( widthPercent / 100 ) * width,
height: ( heightPercent / 100 ) * height,
};
}

async drawImage( src, rect ) {
if ( ! src ) {
return;
}

if ( rect.width <= 0 || rect.height <= 0 ) {
return;
}

const image = await this.loadImage( src );
if ( ! image ) {
return;
}

this.context.drawImage( image, rect.x, rect.y, rect.width, rect.height );
}

loadImage( src ) {
if ( this.imageCache.has( src ) ) {
return this.imageCache.get( src );
}

const promise = new Promise( ( resolve, reject ) => {
const image = new Image();
image.crossOrigin = 'anonymous';
image.onload = () => resolve( image );
image.onerror = () => {
console.warn( 'GF Visual Configurator: Unable to load image', src );
resolve( null );
};
image.src = src;
} );

this.imageCache.set( src, promise );
return promise;
}

updateResultField() {
if ( ! this.hiddenInput ) {
return;
}

try {
const data = this.canvas.toDataURL( 'image/png' );
this.hiddenInput.value = data;
} catch ( error ) {
console.error( 'GF Visual Configurator: Unable to export canvas.', error );
}
}
}

function initAll( root ) {
const elements = root.querySelectorAll( '.gf-visual-configurator' );
elements.forEach( ( element ) => {
if ( element.dataset.vpcInitialized ) {
return;
}

const instance = new VisualConfigurator( element );
instance.init();
element.dataset.vpcInitialized = '1';
} );
}

document.addEventListener( 'DOMContentLoaded', () => {
initAll( document );
} );

if ( window.jQuery ) {
window.jQuery( document ).on( 'gform_post_render', () => {
initAll( document );
} );
}
})();
