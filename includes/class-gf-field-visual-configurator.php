<?php
/**
 * Gravity Forms Visual Configurator field definition.
 *
 * @package GFVisualProductConfigurator
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'GF_Visual_Product_Configurator_Field' ) ) {

/**
 * Visual Configurator field class.
 */
class GF_Visual_Product_Configurator_Field extends GF_Field {

/**
 * Field type name.
 *
 * @var string
 */
public $type = 'visual_configurator';

/**
 * Register hooks and field with Gravity Forms.
 */
public static function register() {
GF_Fields::register( new self() );

add_filter( 'gform_add_field_buttons', array( __CLASS__, 'add_form_editor_button' ) );
add_filter( 'gform_tooltips', array( __CLASS__, 'register_tooltips' ) );
add_action( 'gform_field_standard_settings', array( __CLASS__, 'add_field_settings' ), 10, 2 );
add_action( 'gform_editor_js_set_default_values', array( __CLASS__, 'set_default_properties' ) );
}

/**
 * Get the field title used in the editor.
 *
 * @return string
 */
public function get_form_editor_field_title() {
return esc_html__( 'Visual Product Configurator', 'gf-visual-product-configurator' );
}

/**
 * Return field description for the editor panel.
 *
 * @return string
 */
public function get_form_editor_field_description() {
return esc_html__( 'Display a live, layered product preview and capture the final configuration as an image.', 'gf-visual-product-configurator' );
}

/**
 * Specify which field settings to display in the form editor for this field type.
 *
 * @return array
 */
public function get_form_editor_field_settings() {
return array(
'label_setting',
'admin_label_setting',
'size_setting',
'visibility_setting',
'css_class_setting',
'visual_configurator_setting',
);
}

/**
 * Visual Configurator field does not support conditional logic as a target.
 *
 * @return bool
 */
public function is_conditional_logic_supported() {
return false;
}

/**
 * Render the field input markup on the front end.
 *
 * @param array       $form  Form object.
 * @param string      $value Current value.
 * @param null|array  $entry Entry object.
 * @param string      $form_id  Form ID.
 * @param string      $field_id Field ID.
 * @param string|null $html_id HTML ID attribute.
 * @param string|null $css_class CSS class attribute.
 *
 * @return string
 */
public function get_field_input( $form, $value = '', $entry = null ) {
$form_id  = isset( $form['id'] ) ? absint( $form['id'] ) : 0;
$field_id = absint( $this->id );
$html_id  = $this->get_input_id( $form_id );
$name     = sprintf( 'input_%d', $field_id );

$config      = $this->get_config_settings();
$config_json = wp_json_encode( $config );
$canvas      = isset( $config['canvas'] ) ? $config['canvas'] : array();
$width       = isset( $canvas['width'] ) ? absint( $canvas['width'] ) : 600;
$height      = isset( $canvas['height'] ) ? absint( $canvas['height'] ) : 600;

$hidden_input = sprintf(
'<input type="hidden" name="%1$s" id="%2$s" value="%3$s" class="gf-vpc-result" />',
esc_attr( $name ),
esc_attr( $html_id ),
esc_attr( $value )
);

$canvas_markup = sprintf(
'<canvas class="gf-vpc-canvas" width="%1$d" height="%2$d"></canvas>',
$width,
$height
);

$container_markup = sprintf(
'<div class="gf-visual-configurator" data-field-id="%1$d" data-form-id="%2$d" data-config="%3$s">%4$s<div class="gf-vpc-control-container"></div>%5$s</div>',
$field_id,
$form_id,
esc_attr( $config_json ),
$canvas_markup,
$hidden_input
);

return sprintf( '<div class="gf-visual-configurator-field">%s</div>', $container_markup );
}

/**
 * Format entry value for the entry detail view.
 *
 * @param string $value Entry value.
 * @param string $currency Currency.
 * @param bool   $use_text Use text.
 * @param string $format Format.
 * @param string $media Media.
 *
 * @return string
 */
public function get_value_entry_detail( $value, $currency = '', $use_text = false, $format = 'html', $media = 'screen' ) {
if ( empty( $value ) ) {
return ''; // Nothing to display.
}

if ( 'text' === $format ) {
return $value;
}

return sprintf( '<img class="gf-vpc-entry-image" src="%s" alt="%s" />', esc_attr( $value ), esc_attr__( 'Configured product preview', 'gf-visual-product-configurator' ) );
}

/**
 * Add field button in the editor.
 *
 * @param array $field_groups Field button groups.
 *
 * @return array
 */
public static function add_form_editor_button( $field_groups ) {
foreach ( $field_groups as &$group ) {
if ( 'advanced_fields' === $group['name'] ) {
$group['fields'][] = array(
'class'     => 'button',
'value'     => esc_html__( 'Visual Configurator', 'gf-visual-product-configurator' ),
'data-type' => 'visual_configurator',
);
break;
}
}

return $field_groups;
}

/**
 * Register Gravity Forms tooltips.
 *
 * @param array $tooltips Existing tooltips.
 *
 * @return array
 */
public static function register_tooltips( $tooltips ) {
$tooltips['visual_configurator_canvas'] = sprintf( '<h6>%1$s</h6><p>%2$s</p>', esc_html__( 'Canvas Settings', 'gf-visual-product-configurator' ), esc_html__( 'Define the dimensions and base product image shown beneath all layers.', 'gf-visual-product-configurator' ) );
$tooltips['visual_configurator_layers'] = sprintf( '<h6>%1$s</h6><p>%2$s</p>', esc_html__( 'Layer Stack', 'gf-visual-product-configurator' ), esc_html__( 'Configure each layer, choose the controlling field, and map values to colors or images.', 'gf-visual-product-configurator' ) );

return $tooltips;
}

/**
 * Output the field settings panel in the editor.
 *
 * @param int $position Current position index.
 * @param int $form_id  Form ID.
 */
public static function add_field_settings( $position, $form_id ) {
if ( 50 !== $position ) {
return;
}
?>
<li class="visual_configurator_setting field_setting" style="display:none;">
<input type="hidden" id="visual_configurator_settings" />
<div class="gf-vpc-setting-section" data-gf-tooltip="visual_configurator_canvas">
<h4><?php esc_html_e( 'Preview Canvas', 'gf-visual-product-configurator' ); ?></h4>
<div class="gf-vpc-field-grid">
<label for="gf-vpc-canvas-width"><?php esc_html_e( 'Width (px)', 'gf-visual-product-configurator' ); ?></label>
<input type="number" id="gf-vpc-canvas-width" class="small" min="1" step="1" />

<label for="gf-vpc-canvas-height"><?php esc_html_e( 'Height (px)', 'gf-visual-product-configurator' ); ?></label>
<input type="number" id="gf-vpc-canvas-height" class="small" min="1" step="1" />

<label for="gf-vpc-base-image"><?php esc_html_e( 'Base Image', 'gf-visual-product-configurator' ); ?></label>
<div class="gf-vpc-media-control">
<input type="text" id="gf-vpc-base-image" readonly />
<button type="button" class="button gf-vpc-select-media" data-target="baseImage"><?php esc_html_e( 'Select Image', 'gf-visual-product-configurator' ); ?></button>
<button type="button" class="button-link gf-vpc-clear-media" data-target="baseImage"><?php esc_html_e( 'Clear', 'gf-visual-product-configurator' ); ?></button>
</div>
</div>
</div>

<div class="gf-vpc-setting-section" data-gf-tooltip="visual_configurator_layers">
<h4><?php esc_html_e( 'Layer Stack', 'gf-visual-product-configurator' ); ?></h4>
<p class="description"><?php esc_html_e( 'Create, sort, and configure the layers that will be rendered on the preview canvas.', 'gf-visual-product-configurator' ); ?></p>
<ul class="gf-vpc-layers" aria-live="polite"></ul>
<button type="button" class="button gf-vpc-add-layer"><?php esc_html_e( 'Add Layer', 'gf-visual-product-configurator' ); ?></button>
</div>

<template id="gf-vpc-layer-template">
<li class="gf-vpc-layer" data-layer-index="">
<div class="gf-vpc-layer-header">
<span class="gf-vpc-layer-title"></span>
<div class="gf-vpc-layer-actions">
<button type="button" class="button-link gf-vpc-remove-layer"><?php esc_html_e( 'Remove', 'gf-visual-product-configurator' ); ?></button>
<span class="dashicons dashicons-move" aria-hidden="true"></span>
</div>
</div>
<div class="gf-vpc-layer-body">
<label>
<span><?php esc_html_e( 'Layer Name', 'gf-visual-product-configurator' ); ?></span>
<input type="text" class="gf-vpc-layer-name" />
</label>

<label>
<span><?php esc_html_e( 'Layer Type', 'gf-visual-product-configurator' ); ?></span>
<select class="gf-vpc-layer-type">
<option value="color_fill"><?php esc_html_e( 'Color Fill', 'gf-visual-product-configurator' ); ?></option>
<option value="image_upload"><?php esc_html_e( 'Image (from Upload)', 'gf-visual-product-configurator' ); ?></option>
<option value="image_choice"><?php esc_html_e( 'Image (from Choice)', 'gf-visual-product-configurator' ); ?></option>
<option value="image_overlay"><?php esc_html_e( 'Image Overlay', 'gf-visual-product-configurator' ); ?></option>
</select>
</label>

<label>
<span><?php esc_html_e( 'Control Field ID', 'gf-visual-product-configurator' ); ?></span>
<input type="text" class="gf-vpc-layer-control" placeholder="e.g. 5" />
</label>

<fieldset class="gf-vpc-layer-position">
<legend><?php esc_html_e( 'Position &amp; Size (%)', 'gf-visual-product-configurator' ); ?></legend>
<label>
<span><?php esc_html_e( 'X', 'gf-visual-product-configurator' ); ?></span>
<input type="text" class="gf-vpc-layer-pos" data-axis="x" placeholder="0" />
</label>
<label>
<span><?php esc_html_e( 'Y', 'gf-visual-product-configurator' ); ?></span>
<input type="text" class="gf-vpc-layer-pos" data-axis="y" placeholder="0" />
</label>
<label>
<span><?php esc_html_e( 'Width', 'gf-visual-product-configurator' ); ?></span>
<input type="text" class="gf-vpc-layer-pos" data-axis="width" placeholder="100" />
</label>
<label>
<span><?php esc_html_e( 'Height', 'gf-visual-product-configurator' ); ?></span>
<input type="text" class="gf-vpc-layer-pos" data-axis="height" placeholder="100" />
</label>
</fieldset>

<label class="gf-vpc-layer-conditional">
<input type="checkbox" class="gf-vpc-layer-conditional-toggle" />
<span><?php esc_html_e( 'Enable Conditional Logic for this Layer', 'gf-visual-product-configurator' ); ?></span>
</label>

<div class="gf-vpc-layer-media gf-vpc-layer-overlay">
<label>
<span><?php esc_html_e( 'Overlay Image', 'gf-visual-product-configurator' ); ?></span>
<div class="gf-vpc-media-control">
<input type="text" class="gf-vpc-layer-overlay-url" readonly />
<button type="button" class="button gf-vpc-select-media" data-target="overlayImage"><?php esc_html_e( 'Select Image', 'gf-visual-product-configurator' ); ?></button>
<button type="button" class="button-link gf-vpc-clear-media" data-target="overlayImage"><?php esc_html_e( 'Clear', 'gf-visual-product-configurator' ); ?></button>
</div>
</label>
</div>

<div class="gf-vpc-layer-choice-mapping">
<h5><?php esc_html_e( 'Image Choice Mapping', 'gf-visual-product-configurator' ); ?></h5>
<ul class="gf-vpc-choice-list"></ul>
<button type="button" class="button gf-vpc-add-choice"><?php esc_html_e( 'Add Choice Image', 'gf-visual-product-configurator' ); ?></button>
</div>
</div>
</li>
</template>

<template id="gf-vpc-choice-template">
<li class="gf-vpc-choice" data-choice-index="">
<div class="gf-vpc-choice-fields">
<input type="text" class="gf-vpc-choice-value" placeholder="<?php esc_attr_e( 'Choice value (e.g. Red)', 'gf-visual-product-configurator' ); ?>" />
<div class="gf-vpc-media-control">
<input type="text" class="gf-vpc-choice-image" readonly />
<button type="button" class="button gf-vpc-select-media" data-target="choiceImage"><?php esc_html_e( 'Select Image', 'gf-visual-product-configurator' ); ?></button>
<button type="button" class="button-link gf-vpc-remove-choice"><?php esc_html_e( 'Remove', 'gf-visual-product-configurator' ); ?></button>
</div>
</div>
</li>
</template>
</li>
<?php
}

/**
 * Ensure the field has default properties when added to a form.
 */
public static function set_default_properties() {
?>
case 'visual_configurator':
field.label = <?php echo wp_json_encode( esc_html__( 'Visual Product Configurator', 'gf-visual-product-configurator' ) ); ?>;
field.visual_configurator_settings = <?php echo wp_json_encode( self::get_default_settings() ); ?>;
break;
<?php
}

/**
 * Retrieve default configuration settings.
 *
 * @return array
 */
public static function get_default_settings() {
return array(
'canvas' => array(
'width'     => 600,
'height'    => 600,
'baseImage' => array(
'id'  => 0,
'url' => '',
),
),
'layers' => array(),
);
}

/**
 * Get the stored configuration settings for this field.
 *
 * @return array
 */
protected function get_config_settings() {
$settings = isset( $this->visual_configurator_settings ) ? $this->visual_configurator_settings : array();

if ( empty( $settings ) || ! is_array( $settings ) ) {
$settings = self::get_default_settings();
}

return $settings;
}
}
}
