<script lang="ts">
	import DocPage from '#lib/components/DocPage.svelte';

	const EMAIL = 'coding@f-kleinicke.de';
	const doc = {
		title: 'Impressum',
		description: 'Anbieterkennzeichnung für fastforks.dev / Legal notice for fastforks.dev.'
	};
</script>

<DocPage {doc}>
	{#snippet eyebrow()}Rechtliches / Legal{/snippet}
	{#snippet intro()}
		<p>Deutsch; the English translation follows below.</p>
	{/snippet}

	<h2 id="anbieter">Angaben gemäß § 5 DDG</h2>
	<p>Florian Nick<br />John-Zenger-Str. 19<br />69126 Heidelberg<br />Deutschland</p>

	<h2 id="kontakt">Kontakt</h2>
	<p>
		E-Mail: <a href="mailto:{EMAIL}">{EMAIL}</a><br />
		LinkedIn: <a href="https://www.linkedin.com/in/kleinicke">linkedin.com/in/kleinicke ↗</a>
	</p>

	<h2 id="verantwortlich">Verantwortlich für den Inhalt</h2>
	<p>
		Verantwortlich im Sinne des § 18 Abs. 2 MStV:<br />Florian Nick<br />John-Zenger-Str. 19<br />69126
		Heidelberg<br />Deutschland
	</p>

	<h2 id="haftung">Haftung und Urheberrecht</h2>
	<h3>Inhalte</h3>
	<p>
		Als Diensteanbieter bin ich für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
		verantwortlich. Eine Verpflichtung zur Überwachung übermittelter oder gespeicherter fremder Informationen
		besteht im Rahmen der gesetzlichen Vorschriften nicht. Verpflichtungen zur Entfernung oder Sperrung der
		Nutzung von Informationen nach den allgemeinen Gesetzen bleiben unberührt.
	</p>
	<h3>Externe Links</h3>
	<p>
		Dieses Angebot enthält Links zu Websites Dritter. Für deren Inhalte ist stets der jeweilige Anbieter
		verantwortlich. Bei Bekanntwerden konkreter Rechtsverletzungen werden entsprechende Links entfernt.
	</p>
	<h3>Urheberrecht</h3>
	<p>
		Die von mir erstellten Inhalte und Werke unterliegen dem deutschen Urheberrecht. fastforks steht unter
		der Apache-2.0-Lizenz; übernommener Modellcode und Modellgewichte unterliegen den in den jeweiligen
		Repositories genannten Lizenzen.
	</p>

	<h2 id="english">English translation</h2>
	<h3>Provider information</h3>
	<p>Florian Nick<br />John-Zenger-Str. 19<br />69126 Heidelberg<br />Germany</p>
	<h3>Contact</h3>
	<p>
		Email: <a href="mailto:{EMAIL}">{EMAIL}</a><br />
		LinkedIn: <a href="https://www.linkedin.com/in/kleinicke">linkedin.com/in/kleinicke ↗</a>
	</p>
	<h3>Responsible for editorial content</h3>
	<p>Responsible under § 18(2) of the German Interstate Media Treaty (MStV): Florian Nick, address as above.</p>
	<h3>Liability and copyright</h3>
	<p>
		I am responsible for my own content under applicable law. Third-party websites linked from this site are
		the responsibility of their providers; links are removed if I become aware of a specific legal violation.
	</p>
	<p>
		Content and works created by me are subject to German copyright law. fastforks is licensed under
		Apache-2.0; vendored model code and model weights are governed by the licences stated in their
		repositories.
	</p>
	<p><em>This English section is provided for convenience. The German version is authoritative.</em></p>
</DocPage>
