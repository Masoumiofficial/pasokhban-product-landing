<?php
/**
 * Plugin Name:       گپینه | لندینگ و راهنما
 * Plugin URI:        https://etehadwp.com/gapineh/
 * Description:       لندینگ و راهنمای گپینه را روی آدرس /gapineh/ سایت منتشر می‌کند. شامل شورت‌کد [gapineh] (و [gapineh_landing]) برای نمایش داخل برگه‌های المنتور و دو قالب برگهٔ تمام‌صفحه (لندینگ و راهنما).
 * Version:           1.3.3
 * Author:            etehadwp.com
 * License:           GPL-2.0-or-later
 * Text Domain:       gapineh-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

define('GAPINEH_LANDING_VERSION', '1.3.3');
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
    if ($ext === 'html') {
        header('Cache-Control: no-cache');
        $html = gapineh_landing_inject_site_hooks(file_get_contents($file));
        header('Content-Length: ' . strlen($html));
        echo $html;
        exit;
    }
    header('Cache-Control: public, max-age=604800');
    $mtime = (int) filemtime($file);
    $etag = '"' . md5($file . '|' . $mtime . '|' . filesize($file)) . '"';
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');
    header('ETag: ' . $etag);
    $not_modified = false;
    if (!empty($_SERVER['HTTP_IF_NONE_MATCH']) && trim((string) $_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        $not_modified = true;
    }
    if (!$not_modified && !empty($_SERVER['HTTP_IF_MODIFIED_SINCE']) && strtotime((string) $_SERVER['HTTP_IF_MODIFIED_SINCE']) >= $mtime) {
        $not_modified = true;
    }
    if ($not_modified) {
        status_header(304);
        exit;
    }
    header('Content-Length: ' . filesize($file));
    readfile($file);
    exit;
}

add_action('template_redirect', function () {
    if ((string) get_query_var('gapineh_app') === '1') {
        gapineh_landing_serve(get_query_var('gapineh_path'));
    }
}, 0);

/*
 * یک لندینگ اصلی: برگه‌های تکراری (مثلاً برگهٔ المنتوری قبلی با نامک
 * gapineh-landing) با ریدایرکت دائمی 301 به /gapineh/ می‌روند تا فقط
 * یک صفحهٔ لندینگ داشته باشید. از تنظیمات ← لندینگ گپینه قابل خاموش‌کردن است.
 */
add_action('template_redirect', function () {
    if (is_admin()) {
        return;
    }
    if ((string) get_option('gapineh_landing_redirect_dup', '1') !== '1') {
        return;
    }
    $request = isset($GLOBALS['wp']->request) ? trim((string) $GLOBALS['wp']->request, '/') : '';
    if ($request === '' || $request === GAPINEH_APP_SLUG) {
        return;
    }
    $slugs = preg_split('/[\s,]+/', (string) get_option('gapineh_landing_duplicate_slugs', 'gapineh-landing'), -1, PREG_SPLIT_NO_EMPTY);
    if ($slugs && in_array($request, $slugs, true)) {
        wp_safe_redirect(home_url('/' . GAPINEH_APP_SLUG . '/'), 301);
        exit;
    }
}, 1);

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

    $html = gapineh_landing_inject_site_hooks($html);
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
 * ۲.۵) تزریق هوک‌های وردپرس روی خروجی لندینگ
 * تا ویجت‌های سراسری سایت (مثل چت گپینه) روی صفحات لندینگ هم دیده شوند.
 * حالت پیش‌فرض «footer» است و از تنظیمات ← لندینگ گپینه قابل تغییر است.
 * ---------------------------------------------------------------------- */

function gapineh_landing_hooks_mode() {
    $mode = (string) get_option('gapineh_landing_hooks', 'footer');
    return in_array($mode, array('off', 'footer', 'head_footer'), true) ? $mode : 'footer';
}

function gapineh_landing_inject_site_hooks($html) {
    $mode = gapineh_landing_hooks_mode();
    if ($mode === 'off') {
        return $html;
    }
    if (!did_action('wp_enqueue_scripts')) {
        do_action('wp_enqueue_scripts');
    }
    if ($mode === 'head_footer') {
        ob_start();
        wp_print_styles();
        wp_print_head_scripts();
        $head = ob_get_clean();
        if (trim($head) !== '') {
            $html = str_replace('</head>', $head . "
</head>", $html);
        }
    }
    ob_start();
    wp_footer();
    $foot = ob_get_clean();
    if (trim($foot) !== '') {
        $html = str_replace('</body>', $foot . "
</body>", $html);
    }
    // استایل‌های سایت/ویجت‌ها نباید فونت و پالت رنگ طراحی لندینگ را عوض کنند:
    // همهٔ توکن‌های تم تیره/روشن و فونت وزیرمتن، بعد از خروجی وردپرس دوباره تثبیت می‌شوند
    // تا مثلاً تعریف دوبارهٔ --bg یا --text در قالب، حالت تیره را خراب نکند.
    $guard = '<style id="gapineh-landing-theme-guard">'
        . ':root{--bg: #0b1120;--bg-2: #0e1729;--surface: #111a2e;--surface-2: #17223b;--surface-3: #1e2b48;--border: #263552;--border-strong: #3a4c70;--footer-bg: #070c18;--header-bg: rgba(11, 17, 32, 0.88);--text-strong: #f8fafc;--text: #dbe4f0;--text-muted: #a3b1c6;--brand: #22d3ee;--brand-hover: #67e8f9;--brand-text: #67e8f9;--on-brand: #04252d;--brand-soft: rgba(34, 211, 238, 0.12);--brand-border: rgba(34, 211, 238, 0.42);--violet: #c4b5fd;--violet-soft: rgba(167, 139, 250, 0.14);--success-text: #86efac;--success-soft: rgba(34, 197, 94, 0.12);--success-border: rgba(74, 222, 128, 0.45);--warn-text: #fcd34d;--warn-strong: #fde68a;--warn-soft: rgba(245, 158, 11, 0.12);--warn-border: rgba(245, 158, 11, 0.5);--danger-text: #fca5a5;--danger-soft: rgba(239, 68, 68, 0.12);--danger-border: rgba(248, 113, 113, 0.55);--info-text: #bae6fd;--info-soft: rgba(56, 189, 248, 0.1);--info-border: rgba(56, 189, 248, 0.42);--focus: #67e8f9;--hero-glow-1: rgba(34, 211, 238, 0.2);--hero-glow-2: rgba(167, 139, 250, 0.16);--grid-line: rgba(148, 163, 184, 0.07);--label-bg: rgba(11, 17, 32, 0.8);--label-border: rgba(148, 163, 184, 0.38);--hl-from: #67e8f9;--hl-to: #c4b5fd;--fs-xs: 0.8125rem;--fs-sm: 0.875rem;--fs-md: 0.9375rem;--fs-base: 1rem;--fs-lg: 1.125rem;--fs-h3: clamp(1.0625rem, 1rem + 0.3vw, 1.25rem);--fs-h2: clamp(1.625rem, 1.2rem + 1.5vw, 2.25rem);--fs-h1: clamp(2rem, 1.35rem + 2.6vw, 3.25rem);--radius-sm: 8px;--radius-md: 14px;--radius-lg: 20px;--shadow-card: 0 1px 2px rgba(0, 0, 0, 0.3), 0 14px 32px -18px rgba(0, 0, 0, 0.7);--shadow-glow: 0 0 0 1px rgba(34, 211, 238, 0.3), 0 24px 60px -26px rgba(34, 211, 238, 0.45);--container: 1200px;--header-h: 68px;color-scheme:dark;}'
        . '[data-theme=\'light\']{--bg: #f4f7fb;--bg-2: #eaf0f7;--surface: #ffffff;--surface-2: #f3f6fa;--surface-3: #e8eef6;--border: #d6dfea;--border-strong: #b4c2d4;--footer-bg: #e6edf5;--header-bg: rgba(255, 255, 255, 0.9);--text-strong: #0b1324;--text: #1f2a3c;--text-muted: #46566c;--brand: #0e7490;--brand-hover: #155e75;--brand-text: #0a5c72;--on-brand: #ffffff;--brand-soft: rgba(14, 116, 144, 0.08);--brand-border: rgba(14, 116, 144, 0.4);--violet: #6d28d9;--violet-soft: rgba(109, 40, 217, 0.08);--success-text: #166534;--success-soft: rgba(22, 163, 74, 0.09);--success-border: rgba(22, 163, 74, 0.4);--warn-text: #8a3c0a;--warn-strong: #7c2d12;--warn-soft: rgba(217, 119, 6, 0.09);--warn-border: rgba(217, 119, 6, 0.45);--danger-text: #991b1b;--danger-soft: rgba(220, 38, 38, 0.07);--danger-border: rgba(220, 38, 38, 0.45);--info-text: #0c4a6e;--info-soft: rgba(2, 132, 199, 0.07);--info-border: rgba(2, 132, 199, 0.35);--focus: #0e7490;--hero-glow-1: rgba(14, 116, 144, 0.13);--hero-glow-2: rgba(109, 40, 217, 0.09);--grid-line: rgba(15, 23, 42, 0.05);--label-bg: rgba(255, 255, 255, 0.92);--label-border: #c3cfdd;--hl-from: #0e7490;--hl-to: #6d28d9;--shadow-card: 0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 26px -14px rgba(15, 23, 42, 0.18);--shadow-glow: 0 0 0 1px rgba(14, 116, 144, 0.28), 0 22px 50px -26px rgba(14, 116, 144, 0.4);color-scheme:light;}'
        . 'html{direction:rtl;}'
        . 'html body{direction:rtl;text-align:right;background:var(--bg);color:var(--text);}'
        . 'html body,html body h1,html body h2,html body h3,html body h4,html body button,html body input,html body select,html body textarea'
        . '{font-family:\'Vazirmatn Variable\',Vazirmatn,Tahoma,system-ui,sans-serif;}'
        . 'html body h1,html body h2{font-weight:800;}html body h3,html body h4{font-weight:700;}'
        . '</style>';
    $html = str_replace('</body>', $guard . "\n</body>", $html);
    return $html;
}

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
add_shortcode('gapineh_landing', 'gapineh_landing_shortcode');

/*
 * شورت‌کد [gapineh] ذاتاً متعلق به ویجت چتِ افزونهٔ گپینه است؛ فقط وقتی آن را
 * به لندینگ وصل می‌کنیم که افزونهٔ دیگری (مثل خودِ چت گپینه) قبلاً ثبتش نکرده
 * باشد، تا تداخلی پیش نیاید و ویجت چت همه‌جا درست کار کند.
 */
add_action('init', function () {
    if (!shortcode_exists('gapineh')) {
        add_shortcode('gapineh', 'gapineh_landing_shortcode');
    }
}, 100);

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
    if (isset($_POST['gapineh_hooks_save']) && check_admin_referer('gapineh_landing_settings')) {
        $new_mode = isset($_POST['gapineh_hooks']) ? sanitize_key(wp_unslash($_POST['gapineh_hooks'])) : 'footer'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
        if (!in_array($new_mode, array('off', 'footer', 'head_footer'), true)) {
            $new_mode = 'footer';
        }
        update_option('gapineh_landing_hooks', $new_mode);
        update_option('gapineh_landing_redirect_dup', isset($_POST['gapineh_redirect_dup']) ? '1' : '0');
        $slugs_in = isset($_POST['gapineh_duplicate_slugs']) ? sanitize_text_field(wp_unslash($_POST['gapineh_duplicate_slugs'])) : 'gapineh-landing'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        update_option('gapineh_landing_duplicate_slugs', $slugs_in);
        echo '<div class="notice notice-success"><p>تنظیمات ذخیره شد.</p></div>';
    }
    $hooks_mode = gapineh_landing_hooks_mode();
    $redirect_dup = (string) get_option('gapineh_landing_redirect_dup', '1');
    $duplicate_slugs = (string) get_option('gapineh_landing_duplicate_slugs', 'gapineh-landing');
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

        <h2>نمایش ویجت چت و ابزارهای سراسری سایت روی صفحات لندینگ</h2>
        <p>صفحات لندینگ (نشانی <code>/gapineh/</code> و قالب‌های تمام‌صفحه) جدا از قالب سایت رندر می‌شوند؛ برای اینکه ویجت چت گپینه و بقیهٔ ابزارهای سراسری روی آن‌ها هم دیده شوند، خروجی وردپرس به انتهای صفحه تزریق می‌شود:</p>
        <form method="post">
            <?php wp_nonce_field('gapineh_landing_settings'); ?>
            <label><input type="radio" name="gapineh_hooks" value="footer" <?php checked($hooks_mode, 'footer'); ?>> <strong>فقط فوتر (پیشنهادی)</strong> — اسکریپت‌ها و ویجت‌هایی که در فوتر سایت لود می‌شوند</label><br>
            <label><input type="radio" name="gapineh_hooks" value="head_footer" <?php checked($hooks_mode, 'head_footer'); ?>> <strong>هدر و فوتر کامل</strong> — اگر ویجت با حالت قبل نیامد (استایل‌های بیشتری از سایت لود می‌شود)</label><br>
            <label><input type="radio" name="gapineh_hooks" value="off" <?php checked($hooks_mode, 'off'); ?>> <strong>خاموش</strong> — لندینگ کاملاً مستقل، بدون هیچ ابزار سراسری</label>
            <hr>
            <p><strong>یک صفحهٔ لندینگ اصلی:</strong> برگه‌های تکراری (مثل برگهٔ المنتوری قبلی) به لندینگ اصلی <code><?php echo esc_html('/' . GAPINEH_APP_SLUG . '/'); ?></code> ریدایرکت شوند تا فقط یک لندینگ داشته باشید و لینک‌های قدیمی هم خراب نشوند.</p>
            <label><input type="checkbox" name="gapineh_redirect_dup" value="1" <?php checked($redirect_dup, '1'); ?>> ریدایرکت دائمی (301) برگه‌های تکراری به لندینگ اصلی</label><br>
            <label>نامک برگه‌های تکراری: <input type="text" name="gapineh_duplicate_slugs" value="<?php echo esc_attr($duplicate_slugs); ?>" style="width:280px" dir="ltr"></label> <span class="description">با فاصله یا ویرگول جدا کنید؛ مثلاً: gapineh-landing</span>
            <p><button class="button button-primary" name="gapineh_hooks_save" value="1">ذخیرهٔ تنظیمات</button></p>
        </form>
        <?php if (is_dir(ABSPATH . GAPINEH_APP_SLUG)) : ?>
        <div class="notice notice-warning inline"><p>⚠️ پوشه‌ای به نام <code>gapineh</code> در ریشهٔ هاست (public_html) وجود دارد و روی نشانی <code>/gapineh/</code> بر افزونه اولویت می‌گیرد. اگر داخلش ناقص است (مثلاً فقط index.html بدون پوشهٔ assets)، صفحه خطای «کامل بارگذاری نشد» می‌دهد. یا محتویات کامل بسته را همان‌جا بریزید، یا پوشه را حذف/تغییرنام دهید تا افزونه خودش صفحه را سرو کند.</p></div>
        <?php endif; ?>
        <?php global $shortcode_tags; if (!empty($shortcode_tags['gapineh']) && $shortcode_tags['gapineh'] !== 'gapineh_landing_shortcode') : ?>
        <div class="notice notice-info inline"><p>ℹ️ شورت‌کد <code>[gapineh]</code> روی این سایت توسط افزونهٔ چت گپینه برای <strong>ویجت گفتگو</strong> ثبت شده و دست نخورده باقی می‌ماند؛ برای نمایش لندینگ داخل المنتور از <code>[gapineh_landing]</code> استفاده کنید.</p></div>
        <?php endif; ?>
        <p>عیب‌یابی سریع: اگر پیام «صفحه کامل بارگذاری نشد» دیدید، اول کش افزونهٔ کش و CDN (مثل ابر آروان) را کامل پاک کنید و با پنجرهٔ خصوصی دوباره باز کنید؛ این پیام فقط وقتی می‌آید که فایل جاوااسکریپت لندینگ واقعاً لود نشود.</p>

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
