<script lang="ts">
	import DocPage from '#lib/components/DocPage.svelte';

	const EMAIL = 'coding@f-kleinicke.de';
	const CF_PRIVACY = 'https://www.cloudflare.com/privacypolicy/';
	const doc = {
		title: 'Datenschutzerklärung',
		description:
			'Was beim Besuch von fastforks.dev verarbeitet wird: keine Cookies, kein Tracking. Privacy policy of fastforks.dev.'
	};
</script>

<DocPage {doc}>
	{#snippet eyebrow()}Rechtliches / Privacy{/snippet}
	{#snippet intro()}
		<p>Deutsch; the English translation follows below. Stand / updated: November 2026.</p>
	{/snippet}

	<h2 id="ueberblick">Datenschutz auf einen Blick</h2>
	<p>
		fastforks.dev setzt keine Cookies, verwendet keine Analyse- oder Tracking-Werkzeuge, lädt keine Inhalte
		von Drittanbietern (Schriften, Skripte, Videos) nach und hat weder Nutzerkonten noch Kontaktformulare.
		Beim Abruf der Seiten verarbeitet der Hostinganbieter technisch notwendige Verbindungsdaten.
	</p>
	<p>Diese Erklärung gilt für fastforks.dev und www.fastforks.dev.</p>

	<h2 id="verantwortlicher">Verantwortlicher</h2>
	<p>
		Florian Nick<br />John-Zenger-Str. 19<br />69126 Heidelberg<br />Deutschland<br />
		<a href="mailto:{EMAIL}">{EMAIL}</a>
	</p>

	<h2 id="hosting">Hosting und Auslieferung</h2>
	<p>
		Die Website wird über Cloudflare Pages bereitgestellt (Cloudflare, Inc., 101 Townsend St., San Francisco,
		CA 94107, USA). Beim Abruf einer Seite verarbeitet Cloudflare technisch erforderliche Daten, insbesondere
		IP-Adresse, Zeitpunkt, angeforderte Ressource, Referrer sowie Browser- und Geräteinformationen, um die
		Seiten auszuliefern und vor Angriffen zu schützen. Ich selbst werte diese Daten nicht aus und führe keine
		eigenen Server-Logs.
	</p>
	<p>
		Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt in der sicheren, stabilen
		und effizienten Bereitstellung der Website. Mit Cloudflare besteht ein Vertrag zur Auftragsverarbeitung
		(Art. 28 DSGVO). Eine Übermittlung in die USA ist möglich; Cloudflare ist unter dem EU-US Data Privacy
		Framework zertifiziert (Angemessenheitsbeschluss der EU-Kommission, Art. 45 DSGVO). Die Speicherdauer
		richtet sich nach der technischen Notwendigkeit und den Löschfristen von Cloudflare. Weitere Informationen:
		<a href={CF_PRIVACY}>Datenschutzhinweise von Cloudflare ↗</a>.
	</p>

	<h2 id="speicher">Keine Cookies, kein Tracking</h2>
	<p>
		Die Website setzt keine Cookies und keine Analyse-, Werbe- oder Tracking-Dienste ein. Damit die
		Zurück-Navigation die Scrollposition wiederherstellt, legt die Seite während der Sitzung im
		Session Storage Ihres Browsers technische Navigationsdaten (etwa Scrollpositionen) ab. Diese verlassen Ihr
		Gerät nicht und werden beim Schließen des Tabs gelöscht. Diese Speicherung ist für die von Ihnen
		gewünschte Funktion unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG) und benötigt keine Einwilligung.
	</p>

	<h2 id="links">Externe Links</h2>
	<p>
		Die Website verlinkt unter anderem auf GitHub, PyPI, Hugging Face, LinkedIn und wissenschaftliche
		Veröffentlichungen. Erst wenn Sie einen solchen Link aufrufen, werden Daten an den jeweiligen Anbieter
		übertragen; für die weitere Verarbeitung gelten dessen Datenschutzhinweise. Gleiches gilt, wenn Sie
		fastforks installieren oder Modellgewichte herunterladen: Diese Downloads laufen über PyPI, GitHub und
		Hugging Face, nicht über diese Website.
	</p>

	<h2 id="rechte">Ihre Rechte</h2>
	<p>
		Soweit die gesetzlichen Voraussetzungen erfüllt sind, haben Sie das Recht auf Auskunft (Art. 15 DSGVO),
		Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
		Datenübertragbarkeit (Art. 20) und Widerspruch gegen eine Verarbeitung auf Grundlage von Art. 6 Abs. 1
		lit. f DSGVO (Art. 21). Sie können sich außerdem bei einer Datenschutzaufsichtsbehörde beschweren
		(Art. 77 DSGVO); zuständig am Sitz des Betreibers ist der Landesbeauftragte für den Datenschutz und die
		Informationsfreiheit Baden-Württemberg.
	</p>
	<p>Fragen oder die Ausübung Ihrer Rechte richten Sie bitte an <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>

	<h2 id="english">English translation</h2>
	<h3>Privacy at a glance</h3>
	<p>
		fastforks.dev sets no cookies, uses no analytics or tracking, loads no third-party content (fonts,
		scripts, videos) and has no user accounts or contact forms. When you request a page, the hosting
		provider processes the connection data needed to deliver it. This policy covers fastforks.dev and
		www.fastforks.dev.
	</p>
	<h3>Controller</h3>
	<p>Florian Nick, John-Zenger-Str. 19, 69126 Heidelberg, Germany, <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
	<h3>Hosting and delivery</h3>
	<p>
		The site is delivered by Cloudflare Pages (Cloudflare, Inc., USA). To deliver and protect the pages,
		Cloudflare processes technically necessary data such as the IP address, time, requested resource,
		referrer and browser or device information. I do not analyse this data and keep no server logs of my own.
		The legal basis is Art. 6(1)(f) GDPR (secure, stable and efficient delivery of the site). A data
		processing agreement under Art. 28 GDPR is in place; transfers to the USA rely on Cloudflare's
		certification under the EU-US Data Privacy Framework (Art. 45 GDPR). Retention follows technical need and
		Cloudflare's deletion periods. See <a href={CF_PRIVACY}>Cloudflare's privacy policy ↗</a>.
	</p>
	<h3>No cookies, no tracking</h3>
	<p>
		The site sets no cookies and uses no analytics, advertising or tracking services. So that going back
		restores your scroll position, the page keeps navigation data such as scroll positions in your browser's session storage for the
		session. They never leave your device and are cleared when the tab closes. This storage is strictly
		necessary for a function you use (§ 25(2) no. 2 TDDDG) and needs no consent.
	</p>
	<h3>External links</h3>
	<p>
		The site links to GitHub, PyPI, Hugging Face, LinkedIn and research papers, among others. Data reaches
		those providers only when you follow a link, and their privacy policies apply from then on. The same holds
		for installing fastforks or downloading model weights: those downloads come from PyPI, GitHub and Hugging
		Face, not from this site.
	</p>
	<h3>Your rights</h3>
	<p>
		Subject to the statutory requirements, you have the rights of access, rectification, erasure, restriction,
		portability and objection to processing based on Art. 6(1)(f) GDPR (Arts. 15–18, 20, 21 GDPR), and you may
		lodge a complaint with a data-protection authority (Art. 77 GDPR); for the operator this is the State
		Commissioner for Data Protection and Freedom of Information of Baden-Württemberg. Contact
		<a href="mailto:{EMAIL}">{EMAIL}</a> with privacy questions or to exercise your rights.
	</p>
	<p><em>This English section is provided for convenience. The German version is authoritative.</em></p>
</DocPage>
