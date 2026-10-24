<?php
/**
 * Plugin Name:       گپینه | لندینگ و راهنما
 * Plugin URI:        https://etehadwp.com/gapineh/
 * Description:       لندینگ و راهنمای گپینه را روی آدرس /gapineh/ سایت منتشر می‌کند. شامل شورت‌کد [gapineh] (و [gapineh_landing]) برای نمایش داخل برگه‌های المنتور و دو قالب برگهٔ تمام‌صفحه (لندینگ و راهنما).
 * Version:           1.1.0
 * Author:            etehadwp.com
 * License:           GPL-2.0-or-later
 * Text Domain:       gapineh-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

define('GAPINEH_LANDING_VERSION', '1.1.0');
define('GAPINEH_LANDING_DIR', plugin_dir_path(__FILE__));
define('GAPINEH_APP_DIR', GAPINEH_LANDING_DIR . 'app/');
define('GAPINEH_APP_SLUG', 'gapineh');

/* -------------------------------------------------------------------------
 * ۱) انتشار اپ لندینگ روی /gapineh/ و /gapineh/guide/
 * ---------------------------------------------------------------------- */

function gapineh_landing_register_rules() {
    add_rewrite_rule(
        '^' . GAPINEH_APP_SLUG . '(?:/(.*))?$',
        'index.php?gapineh_app=1&gapineh_path=$matches[1]',
        'top'
    );
}
add_action('init', 'gapineh_landing_register_rules');

add_filter('query_vars', function ($vars) {
    $vars[] = 'gapineh_app';
    $vars[] = 'gapineh_path';
    return $vars;
});

register_activation_hook(__FILE__, function () {
    gapineh_landing_register_rules();
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, function () {
    flush_rewrite_rules();
});

/**
 * سرو فایل‌های اپ (HTML/CSS/JS/تصاویر/PDF) از پوشهٔ app افزونه،
 * دقیقاً مثل یک هاست استاتیک تا همهٔ لینک‌های نسبی لندینگ کار کنند.
 */
function gapineh_landing_serve($raw_path) {
    $path = str_replace('\\', '/', rawurldecode((string) $raw_path));

    if ($path === '' || $path === '/') {
        $rel = 'index.html';
    } elseif ($path === 'guide' || $path === 'guide/') {
        $rel = 'guide.html';
    } else {
        $rel = ltrim($path, '/');
    }

    $base = realpath(GAPINEH_APP_DIR);
    $file = ($base === false) ? false : realpath($base . '/' . $rel);

    if ($file === false || strpos($file, $base) !== 0 || !is_file($file)) {
        status_header(404);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>یافت نشد</title><p style="font-family:Tahoma;text-align:center;margin-top:15vh">این نشانی در لندینگ گپینه وجود ندارد. <a href="' . esc_url(home_url('/' . GAPINEH_APP_SLUG . '/')) . '">بازگشت به لندینگ</a></p>';
        exit;
    }

    $mimes = array(
        'html'  => 'text/html; charset=utf-8',
        'css'   => 'text/css; charset=utf-8',
        'js'    => 'application/javascript; charset=utf-8',
        'mjs'   => 'application/javascript; charset=utf-8',
        'svg'   => 'image/svg+xml',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'webp'  => 'image/webp',
        'ico'   => 'image/x-icon',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'pdf'   => 'application/pdf',
        'txt'   => 'text/plain; charset=utf-8',
        'gs'    => 'text/plain; charset=utf-8',
        'json'  => 'application/json; charset=utf-8',
    );

    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (!isset($mimes[$ext])) {
        status_header(403);
        exit;
    }

    status_header(200);
    header('Content-Type: ' . $mimes[$ext]);
    header('Content-Length: ' . filesize($file));
    if ($ext === 'html') {
        header('Cache-Control: no-cache');
    } else {
        header('Cache-Control: public, max-age=604800');
    }
    readfile($file);
    exit;
}

add_action('template_redirect', function () {
    if ((string) get_query_var('gapineh_app') === '1') {
        gapineh_landing_serve(get_query_var('gapineh_path'));
    }
}, 0);

/* -------------------------------------------------------------------------
 * ۲) رندر مستقیم در قالب برگه (بدون آی‌فریم) — برای قالب‌های تمام‌صفحه
 * ---------------------------------------------------------------------- */

function gapineh_landing_render($file) {
    $path = GAPINEH_APP_DIR . $file;
    if (!is_file($path)) {
        status_header(404);
        exit;
    }
    $html = file_get_contents($path);
    $base = esc_url(home_url('/' . GAPINEH_APP_SLUG . '/'));

    // همهٔ نشانی‌های نسبی اپ به ریشهٔ /gapineh/ اشاره کنند، هرجا که این برگه باشد.
    $html = str_replace('<head>', '<head>' . "\n" . '<base href="' . $base . '">', $html);

    // در راهنما، لینک‌های فهرست (#...) باید روی خود همین برگه بمانند، نه روی base.
    if ($file === 'guide.html') {
        $self = esc_url(get_permalink());
        if ($self) {
            $html = str_replace('href="#', 'href="' . $self . '#', $html);
        }
    }

    status_header(200);
    header('Content-Type: text/html; charset=utf-8');
    echo $html;
    exit;
}

add_filter('theme_page_templates', function ($templates) {
    $templates['gapineh-landing-page.php'] = 'گپینه — لندینگ (تمام‌صفحه)';
    $templates['gapineh-guide-page.php']   = 'گپینه — راهنما (تمام‌صفحه)';
    return $templates;
});

add_filter('template_include', function ($template) {
    if (is_page()) {
        $slug = get_page_template_slug();
        if ($slug === 'gapineh-landing-page.php') {
            return GAPINEH_LANDING_DIR . 'templates/landing.php';
        }
        if ($slug === 'gapineh-guide-page.php') {
            return GAPINEH_LANDING_DIR . 'templates/guide.php';
        }
    }
    return $template;
});

/* -------------------------------------------------------------------------
 * ۳) شورت‌کد برای المنتور: [gapineh] و [gapineh_landing]
 *    داخل ابزارک «کد کوتاه» یا «HTML» المنتور بگذارید.
 * ---------------------------------------------------------------------- */

function gapineh_landing_shortcode($atts) {
    $atts = shortcode_atts(
        array(
            'url'    => '',
            'height' => '100vh',
        ),
        $atts,
        'gapineh_landing'
    );

    $url = $atts['url'] !== ''
        ? esc_url($atts['url'])
        : esc_url(home_url('/' . GAPINEH_APP_SLUG . '/'));

    $height = trim((string) $atts['height']);
    if (!preg_match('/^[0-9]+(px|vh|dvh|svh|%|em|rem)$/', $height)) {
        $height = '100vh';
    }

    $style = 'display:block;width:100%;border:0;margin:0;padding:0;height:' . $height . ';';
    if ($height === '100vh') {
        $style .= 'height:100dvh;';
    }

    return '<div class="gapineh-embed" style="width:100%;margin:0;padding:0;line-height:0;">'
        . '<iframe src="' . $url . '" title="لندینگ گپینه" loading="eager" allowfullscreen style="' . esc_attr($style) . '"></iframe>'
        . '</div>';
}
add_shortcode('gapineh', 'gapineh_landing_shortcode');
add_shortcode('gapineh_landing', 'gapineh_landing_shortcode');

/* -------------------------------------------------------------------------
 * ۴) صفحهٔ راهنما در پیشخوان: تنظیمات ← لندینگ گپینه
 * ---------------------------------------------------------------------- */

add_action('admin_menu', function () {
    add_options_page(
        'لندینگ گپینه',
        'لندینگ گپینه',
        'manage_options',
        'gapineh-landing',
        'gapineh_landing_admin_page'
    );
});

add_action('admin_notices', function () {
    if (!current_user_can('manage_options')) {
        return;
    }
    if ((string) get_option('permalink_structure') === '') {
        echo '<div class="notice notice-warning"><p><strong>لندینگ گپینه:</strong> برای کارکردن نشانی <code>/gapineh/</code> باید پیوندهای یکتا روی حالت «نام نوشته» (یا هر حالت غیرساده) باشد: <a href="' . esc_url(admin_url('options-permalink.php')) . '">تنظیمات پیوندهای یکتا</a></p></div>';
    }
});

function gapineh_landing_admin_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    $landing = home_url('/' . GAPINEH_APP_SLUG . '/');
    $guide   = home_url('/' . GAPINEH_APP_SLUG . '/guide/');
    ?>
    <div class="wrap">
        <h1>لندینگ گپینه</h1>
        <p>لندینگ و راهنمای گپینه روی نشانی‌های زیر منتشر شده‌اند و نیازی به آپلود فایل روی هاست نیست:</p>
        <table class="widefat striped" style="max-width:760px">
            <tbody>
                <tr><td style="width:180px"><strong>لندینگ</strong></td><td><a href="<?php echo esc_url($landing); ?>" target="_blank" rel="noopener"><?php echo esc_url($landing); ?></a></td></tr>
                <tr><td><strong>راهنما</strong></td><td><a href="<?php echo esc_url($guide); ?>" target="_blank" rel="noopener"><?php echo esc_url($guide); ?></a></td></tr>
                <tr><td><strong>شورت‌کد المنتور</strong></td><td><input type="text" readonly value="[gapineh]" onclick="this.select()" style="width:260px"> <input type="text" readonly value="[gapineh_landing]" onclick="this.select()" style="width:260px"></td></tr>
            </tbody>
        </table>

        <h2>نمایش داخل برگهٔ المنتور</h2>
        <ol style="line-height:2">
            <li>یک برگهٔ تازه بسازید و نامک (slug) آن را چیزی غیر از <code>gapineh</code> بگذارید؛ مثلاً <code>landing</code>.</li>
            <li>قالب برگه را روی <strong>Elementor Canvas</strong> بگذارید تا سربرگ و پابرگ قالب حذف شود.</li>
            <li>در المنتور، ابزارک <strong>«کد کوتاه»</strong> را بکشید و <code>[gapineh]</code> را وارد کنید. (شورت‌کد <code>[gapineh_landing]</code> هم مثل قبل کار می‌کند.)</li>
            <li>فاصله‌های داخلی سکشن و ستون را صفر کنید و برگه را منتشر کنید.</li>
        </ol>

        <h2>روش جایگزین (بدون آی‌فریم)</h2>
        <p>اگر نمی‌خواهید از آی‌فریم استفاده کنید، برای هر برگه از بخش «قالب» در تنظیمات برگه، یکی از این دو را انتخاب کنید:
        «گپینه — لندینگ (تمام‌صفحه)» یا «گپینه — راهنما (تمام‌صفحه)». در این حالت خود لندینگ مستقیم روی همان برگه نمایش داده می‌شود.</p>

        <h2>نکتهٔ خرید</h2>
        <p>دکمه‌های خرید لندینگ به صفحهٔ محصول گپینه در راست‌چین می‌روند. اگر نشانی صفحهٔ راست‌چین هنوز موقت است، از فایل‌های داخل پوشهٔ <code>app</code> افزونه عبارت <code>rtl-theme.com</code> را پیدا و با نشانی دقیق جایگزین کنید، یا نسخهٔ به‌روز افزونه را دوباره نصب کنید.</p>
    </div>
    <?php
}
