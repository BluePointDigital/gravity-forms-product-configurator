<?php
/**
 * Plugin Name:       Gravity Forms Visual Product Configurator
 * Plugin URI:        https://example.com/
 * Description:       Adds a powerful visual product configurator field type to Gravity Forms with a live canvas preview.
 * Version:           0.1.0
 * Author:            Your Name
 * Author URI:        https://example.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       gf-visual-product-configurator
 * Domain Path:       /languages
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'GF_Visual_Product_Configurator_Plugin' ) ) {

/**
 * Main plugin bootstrap class.
 */
final class GF_Visual_Product_Configurator_Plugin {

/**
 * Plugin version.
 *
 * @var string
 */
public const VERSION = '0.1.0';

/**
 * Holds singleton instance.
 *
 * @var GF_Visual_Product_Configurator_Plugin|null
 */
private static $instance = null;

/**
 * Retrieve singleton instance.
 *
 * @return GF_Visual_Product_Configurator_Plugin
 */
public static function instance() {
if ( null === self::$instance ) {
self::$instance = new self();
}

return self::$instance;
}

/**
 * Constructor.
 */
private function __construct() {
$this->define_constants();

add_action( 'plugins_loaded', array( $this, 'load_textdomain' ) );
add_action( 'gform_loaded', array( $this, 'load_field_type' ), 5 );
add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
add_action( 'gform_enqueue_scripts', array( $this, 'enqueue_frontend_assets' ), 10, 2 );
}

/**
 * Define core plugin constants.
 */
private function define_constants() {
if ( ! defined( 'GF_VPC_VERSION' ) ) {
define( 'GF_VPC_VERSION', self::VERSION );
}

if ( ! defined( 'GF_VPC_PLUGIN_FILE' ) ) {
define( 'GF_VPC_PLUGIN_FILE', __FILE__ );
}

if ( ! defined( 'GF_VPC_PLUGIN_DIR' ) ) {
define( 'GF_VPC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}

if ( ! defined( 'GF_VPC_PLUGIN_URL' ) ) {
define( 'GF_VPC_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
}
}

/**
 * Load plugin textdomain.
 */
public function load_textdomain() {
load_plugin_textdomain( 'gf-visual-product-configurator', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
}

/**
 * Handle plugin activation.
 */
public static function activate() {
// Placeholder for activation tasks.
}

/**
 * Handle plugin deactivation.
 */
public static function deactivate() {
// Placeholder for deactivation tasks.
}

/**
 * Load the Visual Configurator field type when Gravity Forms is ready.
 */
public function load_field_type() {
if ( ! class_exists( 'GFForms' ) ) {
return;
}

require_once GF_VPC_PLUGIN_DIR . 'includes/class-gf-field-visual-configurator.php';

GF_Visual_Product_Configurator_Field::register();
}

/**
 * Enqueue assets for the Gravity Forms editor.
 *
 * @param string $hook Current admin page hook.
 */
public function enqueue_admin_assets( $hook ) {
if ( false === strpos( $hook, 'gravityforms' ) ) {
return;
}

wp_enqueue_media();

if ( ! class_exists( 'GF_Visual_Product_Configurator_Field' ) ) {
require_once GF_VPC_PLUGIN_DIR . 'includes/class-gf-field-visual-configurator.php';
}

wp_enqueue_style(
'gf-vpc-admin',
GF_VPC_PLUGIN_URL . 'assets/css/admin.css',
array(),
self::VERSION
);

wp_enqueue_script(
'gf-vpc-admin',
GF_VPC_PLUGIN_URL . 'assets/js/admin.js',
array( 'jquery', 'gform_form_admin', 'jquery-ui-sortable' ),
self::VERSION,
true
);

wp_localize_script(
'gf-vpc-admin',
'GFVisualConfiguratorDefaults',
GF_Visual_Product_Configurator_Field::get_default_settings()
);
}

/**
 * Enqueue frontend assets when a form contains a Visual Configurator field.
 *
 * @param array $form    Gravity Forms form object.
 * @param bool  $is_ajax Whether the form uses AJAX.
 */
public function enqueue_frontend_assets( $form, $is_ajax ) {
if ( ! $this->form_contains_configurator( $form ) ) {
return;
}

wp_enqueue_style(
'gf-vpc-frontend',
GF_VPC_PLUGIN_URL . 'assets/css/frontend.css',
array(),
self::VERSION
);

wp_enqueue_script(
'gf-vpc-frontend',
GF_VPC_PLUGIN_URL . 'assets/js/frontend.js',
array(),
self::VERSION,
true
);
}

/**
 * Determine if the provided form contains a Visual Configurator field.
 *
 * @param array $form Gravity Forms form array.
 *
 * @return bool
 */
private function form_contains_configurator( $form ) {
if ( empty( $form['fields'] ) || ! is_array( $form['fields'] ) ) {
return false;
}

foreach ( $form['fields'] as $field ) {
if ( isset( $field->type ) && 'visual_configurator' === $field->type ) {
return true;
}
}

return false;
}
}
}

GF_Visual_Product_Configurator_Plugin::instance();

register_activation_hook( __FILE__, array( 'GF_Visual_Product_Configurator_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'GF_Visual_Product_Configurator_Plugin', 'deactivate' ) );
