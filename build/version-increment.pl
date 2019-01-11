@ARGV = qw(.) unless @ARGV;

# finding files in the directory structure recursively
use File::Find;
use utf8;

# getting the current directory
use Cwd;
use Cwd 'abs_path';
my $cwd = getcwd() . "/";

my $newVersion = "0.0.0.0";
my $argc = @ARGV;
my $customVersion = $ARGV[1];

#if (defined $customVersion) {
#  $newVersion = $customVersion;
#  @parts = split(/\./, $customVersion, 4);
#  $newNugetVersion = "$parts[0].$parts[1].$parts[2]$versionSuffix";
#}

# this subroutine will be called for each and every file in the directory structure
find { wanted => sub {
    # filter out only what we need, $_ contains file name without path
    # 
    if ($_ ne "version-increment.pl" && ( ($_ =~ /app\.settings\.ts/) ))
    {
        my $filename = $cwd . $File::Find::name; # here $File::Find::name contains some relative path
        print "$filename\n"; # here $filename contains full path to the file found

        open(my $fh, '<:encoding(UTF-8)', $filename)
          or die "Could not open file '$filename' $!";

        my $newfilename = $filename.".new";
        open(my $fw, '>:encoding(UTF-8)', $newfilename) or die "Could not open file '$filename' $!";

        while (my $row = <$fh>) { # read source file line by line
          chomp $row;
          my $matched = 0;

          #    version: "1.0.0",
          if ($matched == 0 && $row =~ /version:\s*"\d+\.\d+\.\d+(\.\d+){0,1}"/ ) {
              print "app.settings.ts version was changed to: ".$customVersion."\n";
              say $fw "    version: \"$customVersion\",";
              $matched = 1;
          }

          if ($matched == 0) {
              say $fw $row;
          }
        }

        close $fh;
        close $fw;

        # delete initial file and put updated on it's place
        unlink($filename);
        rename ($newfilename, $filename);
    }
}, no_chdir => 1 }, @ARGV;

exit 0;
