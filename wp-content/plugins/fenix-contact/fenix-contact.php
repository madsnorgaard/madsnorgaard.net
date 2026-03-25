<?php
/**
 * Plugin Name: Fenix Contact Endpoint
 * Description: REST API contact form endpoint for fenixnordic.solutions. Accepts POST from that origin only, validates input, and sends email via wp_mail().
 * Version: 1.0.0
 */

defined('ABSPATH') || exit;

add_action('rest_api_init', 'fenix_register_contact_route');

function fenix_register_contact_route() {
    register_rest_route('fenix/v1', '/contact', [
        'methods'             => ['POST', 'OPTIONS'],
        'callback'            => 'fenix_handle_contact',
        'permission_callback' => '__return_true',
    ]);
}

/**
 * Handle OPTIONS preflight and POST submissions.
 * Restricts to fenixnordic.solutions origin only.
 */
function fenix_handle_contact(WP_REST_Request $req) {
    $allowed_origin = 'https://fenixnordic.solutions';
    $origin         = $_SERVER['HTTP_ORIGIN'] ?? '';

    // Reject requests from any other origin
    if ($origin !== $allowed_origin) {
        return new WP_Error('forbidden', 'Origin not permitted', ['status' => 403]);
    }

    // Honeypot: bots fill in the website field; real users leave it empty
    if (!empty($req->get_param('website'))) {
        // Fake success — don't reveal to bots that we caught them
        return rest_ensure_response(['status' => 'ok']);
    }

    $name    = sanitize_text_field($req->get_param('name')    ?? '');
    $email   = sanitize_email($req->get_param('email')        ?? '');
    $message = sanitize_textarea_field($req->get_param('message') ?? '');
    $company = sanitize_text_field($req->get_param('company') ?? '');

    if (empty($name) || empty($email) || empty($message)) {
        return new WP_Error('missing_fields', 'Required fields missing', ['status' => 400]);
    }

    if (!is_email($email)) {
        return new WP_Error('invalid_email', 'Invalid email address', ['status' => 400]);
    }

    $to      = 'phoenixnorgaard@outlook.com';
    $subject = 'Fenix Nordic — Enquiry from ' . $name . ($company ? ' at ' . $company : '');
    $body    = "Name: {$name}\n"
             . ($company ? "Company: {$company}\n" : '')
             . "Email: {$email}\n\n"
             . $message;

    $headers = [
        'Content-Type: text/plain; charset=UTF-8',
        "Reply-To: {$name} <{$email}>",
    ];

    $sent = wp_mail($to, $subject, $body, $headers);

    if ($sent) {
        return rest_ensure_response(['status' => 'ok']);
    }

    return new WP_Error('mail_failed', 'Could not send message. Please try emailing directly.', ['status' => 500]);
}
