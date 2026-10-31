<?php
/**
 * Contact / booking form mail handler (Colorlib kit).
 *
 * The form posts here. With JavaScript (js/form.js) the page shows its own success message when
 * this prints "OK"; anything else is shown as the error. Without JavaScript the visitor gets a
 * small HTML page with the same message and a link back.
 *
 * Set up:
 *   1. 'to'   : the address that should receive the messages.
 *   2. 'from' : an address on YOUR domain (many hosts reject mail whose From: is not theirs);
 *               the visitor's address goes in Reply-To.
 *   3. 'fields': one entry per form field, keyed by the input's name="" attribute. Add, remove
 *               or rename entries so they match the form. Fields not listed here are ignored.
 *        label     : shown in the email
 *        required  : the message is refused without it
 *        type      : 'email' (validated; used as Reply-To), 'text' (one line), 'textarea'
 *        subject   : true = its value becomes the email subject
 *   4. 'honeypot': name of a hidden, empty input bots tend to fill (the kit forms include
 *               <input type="text" name="website" tabindex="-1" autocomplete="off" hidden>).
 */
$config = [
  'to'       => 'you@example.com',
  'from'     => 'website@example.com',
  'subject'  => 'New message from the website',
  'honeypot' => 'fax', // the forms' hidden "fax" input ("website" is a real field here)
  'fields'   => [
    // The contact form (contact.html) and the comment form (blog-details.html).
    'name'    => ['label' => 'Name',    'required' => true,  'type' => 'text'],
    'email'   => ['label' => 'Email',   'required' => true,  'type' => 'email'],
    'website' => ['label' => 'Website', 'required' => false, 'type' => 'text'],
    'message' => ['label' => 'Message', 'required' => true,  'type' => 'textarea'],
  ],
  'max_length' => 5000, // per field, in characters
];

// ---------------------------------------------------------------------------------------------

$is_ajax = strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch'
  || strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'xmlhttprequest';

function respond($text, $is_ajax, $ok = false) {
  if ($is_ajax) {
    header('Content-Type: text/plain; charset=UTF-8');
    echo $text;
  } else {
    header('Content-Type: text/html; charset=UTF-8');
    $msg  = $ok ? 'Thank you, your message has been sent.' : htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    $back = htmlspecialchars($_SERVER['HTTP_REFERER'] ?? '/', ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<title>' . ($ok ? 'Message sent' : 'Message not sent') . '</title>'
       . '<body style="font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem">'
       . '<p>' . $msg . '</p><p><a href="' . $back . '">Back to the site</a></p></body></html>';
  }
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); header('Allow: POST'); exit; }

// Bots fill every input; people never see this one.
if ($config['honeypot'] !== '' && trim((string) ($_POST[$config['honeypot']] ?? '')) !== '') {
  respond('OK', $is_ajax, true); // pretend success, send nothing
}

$values  = [];
$missing = [];
$reply_to = '';
$subject  = $config['subject'];

foreach ($config['fields'] as $key => $field) {
  $raw  = (string) ($_POST[$key] ?? '');
  $type = $field['type'] ?? 'text';
  $raw  = function_exists('mb_substr') ? mb_substr($raw, 0, $config['max_length'], 'UTF-8') : substr($raw, 0, $config['max_length']);
  // One line only, except textareas: a CR or LF in a header field would let a visitor add headers.
  $value = $type === 'textarea' ? trim($raw) : trim(str_replace(["\r", "\n"], ' ', $raw));

  if ($value === '') {
    if (!empty($field['required'])) $missing[] = $field['label'] ?? $key;
    continue;
  }
  if ($type === 'email') {
    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) { $missing[] = 'a valid ' . strtolower($field['label'] ?? 'email address'); continue; }
    if ($reply_to === '') $reply_to = $value;
  }
  if (!empty($field['subject'])) $subject = $value;
  $values[$key] = $value;
}

if ($missing) {
  respond('Please fill in ' . implode(', ', array_unique($missing)) . '.', $is_ajax);
}

$esc  = function ($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
$host = $esc($_SERVER['SERVER_NAME'] ?? 'your site');
$rows = '';
foreach ($values as $key => $value) {
  $label = $esc($config['fields'][$key]['label'] ?? $key);
  $shown = ($config['fields'][$key]['type'] ?? 'text') === 'textarea' ? nl2br($esc($value)) : $esc($value);
  $rows .= '<tr><th align="left" valign="top" style="padding:4px 12px 4px 0">' . $label . '</th><td style="padding:4px 0">' . $shown . '</td></tr>';
}
$body = '<table cellspacing="0" cellpadding="0" style="font:14px/1.5 Arial,sans-serif">' . $rows . '</table>'
      . '<p style="font:12px Arial,sans-serif;color:#777">Sent from the form on ' . $host . '.</p>';

$headers = [
  'From: ' . $config['from'],
  'MIME-Version: 1.0',
  'Content-Type: text/html; charset=UTF-8',
];
if ($reply_to !== '') $headers[] = 'Reply-To: ' . $reply_to;

$sent = mail($config['to'], '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));

$sent ? respond('OK', $is_ajax, true) : respond('Something went wrong. Please try again.', $is_ajax);
